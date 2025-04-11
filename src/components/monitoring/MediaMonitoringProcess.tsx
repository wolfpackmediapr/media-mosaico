
import { Check, Database, LineChart, MessageSquare, Search, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Identify Brand or Topic",
    description: "Selecting the focus for monitoring",
    icon: <Search className="h-8 w-8 text-blue-500" />,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
  },
  {
    number: "02",
    title: "Track Mentions Across Channels",
    description: "Scanning various media platforms for mentions",
    icon: <MessageSquare className="h-8 w-8 text-cyan-500" />,
    color: "text-cyan-500",
    bgColor: "bg-cyan-100",
  },
  {
    number: "03",
    title: "Collect Data",
    description: "Gathering and storing relevant media mentions",
    icon: <Database className="h-8 w-8 text-emerald-500" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
  },
  {
    number: "04",
    title: "Analyze Media Presence",
    description: "Evaluating the brand's visibility and impact",
    icon: <LineChart className="h-8 w-8 text-green-500" />,
    color: "text-green-500",
    bgColor: "bg-green-100",
  },
  {
    number: "05",
    title: "Identify Trends or Issues",
    description: "Detecting patterns or problems in media coverage",
    icon: <LineChart className="h-8 w-8 text-yellow-500" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
  },
  {
    number: "06",
    title: "Take Action",
    description: "Implementing strategies based on analysis",
    icon: <Zap className="h-8 w-8 text-orange-500" />,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
  },
];

export function MediaMonitoringProcess() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold text-center mb-8">Media Monitoring Process</h2>
        
        <div className="relative">
          {/* Process pipeline visualization */}
          <div className="hidden md:block absolute top-16 left-0 w-full h-4 bg-gradient-to-r from-blue-500 via-green-500 to-orange-500 rounded-full opacity-20" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full mb-4 ${step.bgColor}`}>
                  {step.icon}
                </div>
                <div className="text-2xl font-bold mb-1">{step.number}</div>
                <h3 className={`text-lg font-medium mb-2 ${step.color}`}>{step.title}</h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
