import { useEffect, useRef } from 'react';

// 모달이 열려 있을 때 ESC 키로 닫기와 배경 스크롤 잠금을 공통으로 처리한다.
export function useModalEffect(isOpen, onClose, disabled = false) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !disabled) {
        onCloseRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, disabled]);
}
