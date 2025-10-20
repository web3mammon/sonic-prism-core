import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  subtitle?: string;
}

export function MetricsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  subtitle 
}: MetricsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "negative":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAccentColor = () => {
    switch (changeType) {
      case "positive":
        return "border-l-green-500";
      case "negative":
        return "border-l-red-500";
      default:
        return "border-l-primary";
    }
  };

  const getIconBg = () => {
    switch (changeType) {
      case "positive":
        return "bg-gradient-to-br from-green-500/20 to-green-600/10";
      case "negative":
        return "bg-gradient-to-br from-red-500/20 to-red-600/10";
      default:
        return "bg-gradient-to-br from-primary/20 to-primary/10";
    }
  };

  return (
    <Card className={cn(
      "font-manrope border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-muted/50",
      getAccentColor()
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(
            "p-2 rounded-full transition-transform duration-300 group-hover:scale-110",
            getIconBg()
          )}>
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-extralight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="flex items-center space-x-2 mt-2">
          {change && (
            <Badge variant="secondary" className={cn("transition-all", getChangeColor())}>
              {change}
            </Badge>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}