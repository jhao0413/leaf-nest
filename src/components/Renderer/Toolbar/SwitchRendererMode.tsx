import { useRendererModeStore } from '@/store/rendererModeStore';
import { BookOpenText, Newspaper } from 'lucide-react';

const SwitchRendererMode: React.FC = () => {
  const mode = useRendererModeStore((state) => state.rendererMode);
  const setRendererMode = useRendererModeStore((state) => state.setRendererMode);

  return (
    <button
      type="button"
      className="w-12 h-12 mt-4 bg-white rounded-full shadow-md flex items-center justify-center z-10 dark:bg-neutral-900"
      onClick={() => setRendererMode(mode === 'single' ? 'double' : 'single')}
      aria-label={
        mode === 'single' ? 'Switch to double-column mode' : 'Switch to single-column mode'
      }
      title={mode === 'single' ? 'Switch to double-column mode' : 'Switch to single-column mode'}
    >
      {mode === 'single' ? <BookOpenText /> : <Newspaper />}
    </button>
  );
};

export default SwitchRendererMode;
