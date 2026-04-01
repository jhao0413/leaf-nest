import { Button } from '@heroui/react';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { BookOpenText, Newspaper } from 'lucide-react';

const SwitchRendererMode: React.FC = () => {
  const mode = useRendererModeStore((state) => state.rendererMode);
  const setRendererMode = useRendererModeStore((state) => state.setRendererMode);

  return (
    <Button
      className="mt-4 h-12 w-12 rounded-full bg-white shadow-md dark:bg-neutral-900"
      isIconOnly
      variant="outline"
      onPress={() => setRendererMode(mode === 'single' ? 'double' : 'single')}
      aria-label={
        mode === 'single' ? 'Switch to double-column mode' : 'Switch to single-column mode'
      }
    >
      {mode === 'single' ? <BookOpenText className="!size-6" /> : <Newspaper className="!size-6" />}
    </Button>
  );
};

export default SwitchRendererMode;
