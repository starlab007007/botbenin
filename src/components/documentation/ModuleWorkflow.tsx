import { Card } from '@/components/ui/card';

interface ModuleWorkflowProps {
  title: string;
  mermaidCode: string;
  description?: string;
}

export const ModuleWorkflow = ({ title, mermaidCode, description }: ModuleWorkflowProps) => {
  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h4 className="text-xl font-semibold text-foreground">{title}</h4>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      
      <div className="bg-muted/30 p-6 rounded-lg overflow-x-auto">
        <pre className="text-sm text-foreground whitespace-pre-wrap">
{mermaidCode}
        </pre>
      </div>
    </Card>
  );
};
