import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const GEMINI_VISION_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';

interface GeminiClipping {
  title: string;
  content: string;
  category: string;
  summary_who?: string;
  summary_what?: string;
  summary_when?: string;
  summary_where?: string;
  summary_why?: string;
  keywords?: string[];
  client_relevance?: string[];
}

// Download file from Supabase Storage
async function downloadFileFromStorage(supabase: any, filePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from('pdf_uploads').download(filePath);
  if (error) throw new Error(`Storage download error: ${error.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

// Extract a specific page from PDF as a single-page PDF Blob
async function extractPDFPage(pdfBlob: Blob, pageNumber: number): Promise<Blob> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
  newPdfDoc.addPage(copiedPage);
  const pdfBytes = await newPdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Upload image to Gemini File API
async function uploadImageToGemini(blob: Blob, filename: string): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  const uploadResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': bytes.length.toString(),
        'X-Goog-Upload-Header-Content-Type': blob.type,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: filename }
      }),
    }
  );

  const uploadUrl = uploadResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Failed to get upload URL');

  await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': bytes.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: bytes,
  });

  const fileResponse = await fetch(uploadUrl + '&key=' + GEMINI_API_KEY, {
    method: 'GET',
    headers: { 'X-Goog-Upload-Command': 'query' },
  });

  const fileData = await fileResponse.json();
  return fileData.file.uri;
}

// Wait for file processing
async function waitForFileProcessing(fileUri: string, maxAttempts = 60): Promise<void> {
  const fileName = fileUri.split('/').pop();
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
    );
    const data = await response.json();
    
    if (data.state === 'ACTIVE') return;
    if (data.state === 'FAILED') throw new Error('File processing failed');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('File processing timeout');
}

// Process image with Gemini Vision
async function processImageWithGeminiVision(
  blob: Blob,
  filename: string,
  pageNumber: number,
  publicationName: string
): Promise<GeminiClipping[]> {
  console.log(`Processing page ${pageNumber} with Gemini Vision...`);
  
  const fileUri = await uploadImageToGemini(blob, filename);
  await waitForFileProcessing(fileUri);

  const prompt = `Analyze this page from "${publicationName}" and extract all press clippings/articles.
For each clipping, provide:
- title: Article headline
- content: Full article text
- category: One of [Politics, Economy, Health, Education, Security, Environment, Sports, Culture, Technology, Society, Other]
- summary_who: Who is involved
- summary_what: What happened
- summary_when: When it happened
- summary_where: Where it happened
- summary_why: Why it's important
- keywords: Array of key terms
- client_relevance: Array of relevant client names if any

Return ONLY valid JSON array: [{"title":"...","content":"...","category":"..."}]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { file_data: { mime_type: blob.type, file_uri: fileUri } }
          ]
        }]
      })
    }
  );

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  let clippings: GeminiClipping[];
  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    clippings = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
  } catch {
    console.error('Failed to parse Gemini response, returning empty array');
    clippings = [];
  }

  return clippings.map(c => ({ ...c, page_number: pageNumber }));
}

// Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text }] }
      })
    }
  );

  const data = await response.json();
  return data.embedding?.values || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, batchNumber } = await req.json();
    console.log(`Processing batch ${batchNumber} for job ${jobId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get batch task details
    const { data: batchTask, error: batchError } = await supabase
      .from('pdf_batch_tasks')
      .select('*')
      .eq('job_id', jobId)
      .eq('batch_number', batchNumber)
      .single();

    if (batchError || !batchTask) {
      throw new Error(`Batch task not found: ${batchError?.message}`);
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('pdf_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    // Mark batch as processing
    await supabase
      .from('pdf_batch_tasks')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', batchTask.id);

    console.log(`Downloading PDF from: ${job.file_path}`);
    const fileData = await downloadFileFromStorage(supabase, job.file_path);
    const pdfBlob = new Blob([fileData], { type: 'application/pdf' });

    // Process pages in this batch
    const allClippings: any[] = [];
    const totalPagesInBatch = batchTask.end_page - batchTask.start_page + 1;

    for (let pageNum = batchTask.start_page; pageNum <= batchTask.end_page; pageNum++) {
      console.log(`Extracting page ${pageNum}...`);
      const pageBlob = await extractPDFPage(pdfBlob, pageNum);
      
      console.log(`Processing page ${pageNum} with Gemini...`);
      const pageClippings = await processImageWithGeminiVision(
        pageBlob,
        `page_${pageNum}.pdf`,
        pageNum,
        job.publication_name
      );
      
      allClippings.push(...pageClippings);

      // Update batch progress
      const pagesProcessed = pageNum - batchTask.start_page + 1;
      const progress = Math.floor((pagesProcessed / totalPagesInBatch) * 100);
      await supabase
        .from('pdf_batch_tasks')
        .update({ progress, updated_at: new Date().toISOString() })
        .eq('id', batchTask.id);

      console.log(`Batch ${batchNumber} progress: ${progress}% (${pagesProcessed}/${totalPagesInBatch} pages)`);
    }

    // Save clippings with embeddings
    console.log(`Saving ${allClippings.length} clippings to database...`);
    for (const clipping of allClippings) {
      const embeddingText = `${clipping.title} ${clipping.content}`.substring(0, 5000);
      const embedding = await generateEmbedding(embeddingText);

      await supabase.from('press_clippings').insert({
        user_id: job.user_id,
        title: clipping.title,
        content: clipping.content,
        category: clipping.category,
        page_number: clipping.page_number,
        publication_name: job.publication_name,
        summary_who: clipping.summary_who,
        summary_what: clipping.summary_what,
        summary_when: clipping.summary_when,
        summary_where: clipping.summary_where,
        summary_why: clipping.summary_why,
        keywords: clipping.keywords || [],
        client_relevance: clipping.client_relevance || [],
        embedding: `[${embedding.join(',')}]`
      });
    }

    // Mark batch as completed
    await supabase
      .from('pdf_batch_tasks')
      .update({
        status: 'completed',
        progress: 100,
        clippings_count: allClippings.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchTask.id);

    console.log(`Batch ${batchNumber} completed with ${allClippings.length} clippings`);

    // Check for next batch
    const { data: nextBatch } = await supabase
      .from('pdf_batch_tasks')
      .select('batch_number')
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .order('batch_number')
      .limit(1)
      .maybeSingle();

    if (nextBatch) {
      console.log(`Triggering next batch: ${nextBatch.batch_number}`);
      
      // Trigger next batch asynchronously
      supabase.functions.invoke('process-pdf-batch', {
        body: { jobId, batchNumber: nextBatch.batch_number }
      }).catch(err => console.error('Error triggering next batch:', err));
    } else {
      // All batches complete
      console.log('All batches completed! Updating job status...');
      await supabase
        .from('pdf_processing_jobs')
        .update({
          status: 'completed',
          progress: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        batchNumber,
        clippingsFound: allClippings.length,
        hasNextBatch: !!nextBatch
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
