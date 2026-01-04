import { useState, useRef, useEffect } from 'react';
import { Languages } from 'lucide-react';

interface ArabicInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

// Arabic keyboard layout mapping
const arabicKeyMap: Record<string, string> = {
  'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح',
  'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م',
  'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة',
  '[': 'ج', ']': 'د', ';': 'ك', "'": 'ط', ',': 'و', '.': 'ز', '/': 'ظ',
  '`': 'ذ', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩', '0': '٠',
};

const ArabicInput = ({ value, onChange, placeholder, className = '', multiline = false }: ArabicInputProps) => {
  const [isArabicMode, setIsArabicMode] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isArabicMode) return;
    
    const key = e.key.toLowerCase();
    
    if (arabicKeyMap[key]) {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const newValue = value.slice(0, start) + arabicKeyMap[key] + value.slice(end);
      onChange(newValue);
      
      // Set cursor position after the inserted character
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + arabicKeyMap[key].length;
      }, 0);
    }
  };

  const toggleMode = () => {
    setIsArabicMode(!isArabicMode);
    inputRef.current?.focus();
  };

  const inputProps = {
    ref: inputRef as any,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder: placeholder,
    className: `${className} ${isArabicMode ? 'text-right' : 'text-left'}`,
    dir: isArabicMode ? 'rtl' as const : 'ltr' as const,
    style: { fontFamily: isArabicMode ? "'Noto Sans Arabic', 'Arial', sans-serif" : undefined }
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea {...inputProps} />
      ) : (
        <input type="text" {...inputProps} />
      )}
      <button
        type="button"
        onClick={toggleMode}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-all ${
          isArabicMode 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted text-muted-foreground'
        }`}
        title={isArabicMode ? 'Mode Arabe actif' : 'Activer le clavier Arabe'}
      >
        <Languages className="w-4 h-4" />
      </button>
      {isArabicMode && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-primary font-medium">
          عربي
        </span>
      )}
    </div>
  );
};

export default ArabicInput;
