import { useCallback, useState } from 'react';

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  content: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

const initialConfirmation: ConfirmationState = {
  isOpen: false,
  title: '',
  content: '',
  onConfirm: () => {},
};

export const useConfirmation = () => {
  const [confirmation, setConfirmation] = useState<ConfirmationState>(initialConfirmation);

  const showConfirm = useCallback((title: string, content: string, onConfirm: () => void, isDanger = false) => {
    setConfirmation({ isOpen: true, title, content, onConfirm, isDanger });
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { confirmation, showConfirm, closeConfirmation };
};
