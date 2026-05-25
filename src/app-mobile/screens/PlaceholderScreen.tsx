import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const PlaceholderScreen = ({ title, description, icon: Icon }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[hsl(var(--wa-green))]/10 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-[hsl(var(--wa-green))]" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-xs">{description}</p>
      <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
        Phase suivante de WaouhApp
      </p>
    </div>
  );
};
