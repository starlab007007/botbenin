import NativeCategoryPicker from './NativeCategoryPicker';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

/** Variante simple sans création (réutilise NativeCategoryPicker en mode allowCustom=false). */
export default function NativeSelectSheet(props: Props) {
  return <NativeCategoryPicker {...props} allowCustom={false} />;
}
