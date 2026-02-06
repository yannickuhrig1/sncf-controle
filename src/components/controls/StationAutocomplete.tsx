import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Search } from 'lucide-react';

// Gares de Lorraine et principales gares de la région Grand Est
const STATIONS = [
  // Lorraine - Meurthe-et-Moselle (54)
  'Nancy',
  'Nancy-Ville',
  'Toul',
  'Lunéville',
  'Pont-à-Mousson',
  'Longwy',
  'Jarny',
  'Conflans-Jarny',
  'Champigneulles',
  'Frouard',
  'Liverdun',
  'Pagny-sur-Moselle',
  'Blainville-Damelevières',
  
  // Lorraine - Moselle (57)
  'Metz',
  'Metz-Ville',
  'Thionville',
  'Forbach',
  'Sarreguemines',
  'Sarrebourg',
  'Hagondange',
  'Woippy',
  'Uckange',
  'Rombas',
  'Maizières-lès-Metz',
  'Fameck',
  'Florange',
  'Yutz',
  'Bouzonville',
  'Creutzwald',
  'Saint-Avold',
  'Freyming-Merlebach',
  'Béning',
  'Rémilly',
  'Courcelles-sur-Nied',
  'Peltre',
  'Ars-sur-Moselle',
  'Novéant-sur-Moselle',
  'Corny-sur-Moselle',
  
  // Lorraine - Meuse (55)
  'Bar-le-Duc',
  'Verdun',
  'Commercy',
  'Lérouville',
  'Revigny',
  'Montmédy',
  
  // Lorraine - Vosges (88)
  'Épinal',
  'Saint-Dié-des-Vosges',
  'Remiremont',
  'Vittel',
  'Contrexéville',
  'Neufchâteau',
  'Mirecourt',
  'Charmes',
  'Bruyères',
  'Gérardmer',
  
  // Alsace - Bas-Rhin (67)
  'Strasbourg',
  'Strasbourg-Ville',
  'Haguenau',
  'Saverne',
  'Molsheim',
  'Sélestat',
  'Obernai',
  'Bischwiller',
  'Brumath',
  'Wissembourg',
  'Lauterbourg',
  'Niederbronn-les-Bains',
  'Mommenheim',
  'Hochfelden',
  'Dettwiller',
  'Réding',
  'Lutzelbourg',
  'Rosheim',
  'Barr',
  'Dambach-la-Ville',
  'Erstein',
  'Benfeld',
  'Schiltigheim',
  'Bischheim',
  'Vendenheim',
  
  // Alsace - Haut-Rhin (68)
  'Mulhouse',
  'Mulhouse-Ville',
  'Colmar',
  'Saint-Louis',
  'Altkirch',
  'Thann',
  'Cernay',
  'Guebwiller',
  'Bollwiller',
  'Rouffach',
  'Ribeauvillé',
  'Munster',
  'Ensisheim',
  'Rixheim',
  'Illzach',
  
  // Champagne-Ardenne - Marne (51)
  'Reims',
  'Reims-Centre',
  'Champagne-Ardenne TGV',
  'Épernay',
  'Châlons-en-Champagne',
  'Vitry-le-François',
  'Sézanne',
  'Dormans',
  'Aÿ',
  'Bezannes',
  'Muizon',
  'Fismes',
  
  // Champagne-Ardenne - Ardennes (08)
  'Charleville-Mézières',
  'Sedan',
  'Rethel',
  'Givet',
  'Mohon',
  'Nouvion-sur-Meuse',
  
  // Champagne-Ardenne - Aube (10)
  'Troyes',
  'Romilly-sur-Seine',
  'Bar-sur-Aube',
  'Bar-sur-Seine',
  'Vendeuvre',
  
  // Champagne-Ardenne - Haute-Marne (52)
  'Chaumont',
  'Saint-Dizier',
  'Langres',
  'Joinville',
  'Bologne',
  'Culmont-Chalindrey',
  
  // Gares TGV principales
  'Lorraine TGV',
  'Meuse TGV',
  
  // Gares parisiennes (connexions)
  'Paris Est',
  'Paris Gare de Lyon',
  'Paris Nord',
  
  // Luxembourg (gares principales)
  'Luxembourg',
  'Bettembourg',
  'Howald',
  
  // Autres grandes villes (connexions)
  'Dijon-Ville',
  'Besançon Viotte',
  'Lyon Part-Dieu',
  'Lille Flandres',
  'Lille Europe',
  'Bruxelles-Midi',
  'Francfort',
  'Stuttgart',
  'Bâle SNCF',
].sort((a, b) => a.localeCompare(b, 'fr'));

interface StationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function StationAutocomplete({
  value,
  onChange,
  placeholder = 'Rechercher une gare...',
  id,
  className,
  disabled = false,
}: StationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when disabled
  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  // Filter stations based on input
  const filteredStations = inputValue.trim()
    ? STATIONS.filter((station) =>
        station.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 10)
    : STATIONS.slice(0, 10);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredStations.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredStations.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredStations[highlightedIndex]) {
            const selected = filteredStations[highlightedIndex];
            setInputValue(selected);
            onChange(selected);
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [disabled, isOpen, filteredStations, highlightedIndex, onChange]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = (station: string) => {
    if (disabled) return;
    setInputValue(station);
    onChange(station);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} className={cn('relative', disabled && 'opacity-70', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      {isOpen && filteredStations.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {filteredStations.map((station, index) => (
            <li
              key={station}
              role="option"
              aria-selected={highlightedIndex === index}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none',
                highlightedIndex === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => handleSelect(station)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{station}</span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredStations.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
          <p className="text-sm text-muted-foreground text-center">
            Aucune gare trouvée
          </p>
        </div>
      )}
    </div>
  );
}
