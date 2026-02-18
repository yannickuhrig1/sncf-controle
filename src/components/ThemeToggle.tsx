import { Moon, Sun, Briefcase, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Theme, themes, applyTheme, getCurrentTheme } from '@/lib/themes';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const themeIcons = {
  light: Sun,
  dark: Moon,
  pro: Briefcase,
  modern: Sparkles,
} as const;

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getCurrentTheme());

  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentTheme(theme);
  };

  const CurrentIcon = themeIcons[currentTheme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <CurrentIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Changer de thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Thèmes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.values(themes)
          .filter((theme) => !theme.isPremium)
          .map((theme) => {
            const Icon = themeIcons[theme.id];
            return (
              <DropdownMenuItem
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={cn(
                  'cursor-pointer',
                  currentTheme === theme.id && 'bg-accent'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{theme.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {theme.description}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Thèmes Premium
        </DropdownMenuLabel>

        {Object.values(themes)
          .filter((theme) => theme.isPremium)
          .map((theme) => {
            const Icon = themeIcons[theme.id];
            return (
              <DropdownMenuItem
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={cn(
                  'cursor-pointer',
                  currentTheme === theme.id && 'bg-accent'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{theme.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      PREMIUM
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {theme.description}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
