import { useEffect, useMemo, useRef, useState } from "react";
import cloud from "d3-cloud";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { useBuzzWords, type BuzzRange } from "@/hooks/use-buzz-words";

interface LaidOutWord {
  text: string;
  value: number;
  size: number;
  x: number;
  y: number;
  rotate: number;
}

const HEIGHT = 360;
const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--foreground))",
  "hsl(var(--muted-foreground))",
];

function scaleFontSize(value: number, min: number, max: number): number {
  if (max === min) return 28;
  const t = (value - min) / (max - min);
  return 12 + t * 40; // 12 - 52 px
}

export function BuzzWordsCloud() {
  const [range, setRange] = useState<BuzzRange>("week");
  const { words, isLoading, isFetching } = useBuzzWords(range);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [laidOut, setLaidOut] = useState<LaidOutWord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(320, Math.floor(e.contentRect.width));
        setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sized = useMemo(() => {
    if (words.length === 0) return [];
    const values = words.map((w) => w.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return words.map((w) => ({ ...w, size: scaleFontSize(w.value, min, max) }));
  }, [words]);

  useEffect(() => {
    if (sized.length === 0) {
      setLaidOut([]);
      return;
    }
    let cancelled = false;
    const layout = cloud<LaidOutWord>()
      .size([width, HEIGHT])
      .words(sized.map((w) => ({ ...w, x: 0, y: 0, rotate: 0 })) as any)
      .padding(3)
      .rotate(() => (Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -45) : 0))
      .font("Inter, system-ui, sans-serif")
      .fontSize((d: any) => d.size)
      .on("end", (out: any[]) => {
        if (cancelled) return;
        setLaidOut(
          out.map((d) => ({
            text: d.text,
            value: d.value,
            size: d.size,
            x: d.x ?? 0,
            y: d.y ?? 0,
            rotate: d.rotate ?? 0,
          }))
        );
      });
    layout.start();
    return () => {
      cancelled = true;
    };
  }, [sized, width]);

  const handleClick = (text: string) => {
    navigate(`/prensa-digital?q=${encodeURIComponent(text)}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Buzz Words
          </CardTitle>
          <CardDescription>
            Palabras más mencionadas en las RSS feeds del período
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Tabs value={range} onValueChange={(v) => setRange(v as BuzzRange)}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative w-full rounded-md bg-muted/30"
          style={{ height: HEIGHT }}
          role="img"
          aria-label="Nube de palabras de tendencias"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && laidOut.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No hay suficientes datos en este período
            </div>
          )}
          {laidOut.length > 0 && (
            <svg width={width} height={HEIGHT} className="overflow-visible">
              <g transform={`translate(${width / 2}, ${HEIGHT / 2})`}>
                <AnimatePresence>
                  {laidOut.map((w, i) => (
                    <motion.text
                      key={w.text}
                      layoutId={`buzz-${w.text}`}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: w.x,
                        y: w.y,
                        rotate: w.rotate,
                      }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={{ type: "spring", stiffness: 120, damping: 18, delay: i * 0.01 }}
                      textAnchor="middle"
                      style={{
                        fontFamily: "Inter, system-ui, sans-serif",
                        fontSize: w.size,
                        fontWeight: 600,
                        fill: PALETTE[i % PALETTE.length],
                        cursor: "pointer",
                      }}
                      onClick={() => handleClick(w.text)}
                    >
                      <title>{`${w.text} · ${w.value} menciones`}</title>
                      {w.text}
                    </motion.text>
                  ))}
                </AnimatePresence>
              </g>
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BuzzWordsCloud;