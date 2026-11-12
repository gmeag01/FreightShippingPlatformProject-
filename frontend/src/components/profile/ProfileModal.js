import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateMyProfile } from '../../api/members';
import { ROLE_LABEL } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';

// 전화번호 입력 시 하이픈(-)을 자동으로 삽입한다 (예: 01012345678 -> 010-1234-5678)
function formatPhoneNumber(value) {
  if (!value) return '';
  const numbers = value.replace(/[^\d]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

// 로그인한 회원의 프로필(이름, 연락처, 비밀번호)을 조회하고 수정하는 모달
export default function ProfileModal({ isOpen, onClose }) {
  const { me, refreshMe } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(() => me?.name || '');
  const [phone, setPhone] = useState(() => me?.phone || '');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ESC 키로 닫기 및 배경 스크롤 방지
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }

    const phonePattern = /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/;
    if (!phonePattern.test(trimmedPhone)) {
      setErrorMessage('올바른 휴대폰 번호 형식(010-0000-0000)으로 입력해주세요.');
      return;
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        setErrorMessage('현재 비밀번호를 입력해주세요.');
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        setErrorMessage('새 비밀번호는 8자 이상이어야 합니다.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('새 비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        ...(isChangingPassword ? { currentPassword, newPassword } : {}),
      };

      await updateMyProfile(payload);
      if (refreshMe) {
        await refreshMe();
      }
      setSuccessMessage('내 정보가 성공적으로 수정되었습니다.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        '내 정보 수정 중 오류가 발생했습니다.';
      setErrorMessage(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateVehicle = () => {
    onClose();
    navigate('/driver/vehicle');
  };

  if (!isOpen || !me) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-card max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[10px] border p-6 shadow-2xl"
      >
        <div className="border-line flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-h2 text-ink font-bold">내 정보 수정</h3>
            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {ROLE_LABEL[me.role] || me.role}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-subtle hover:text-ink text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 이메일 (아이디) - 변경 불가 */}
          <div>
            <label className="text-caption text-muted block font-medium">아이디 (이메일)</label>
            <input
              type="text"
              value={me.email || ''}
              disabled
              className="border-line text-subtle mt-1 min-h-11 w-full cursor-not-allowed rounded-md border bg-slate-100 px-3 py-2 font-mono text-sm"
            />
            <span className="text-subtle mt-1 block text-xs">
              아이디(이메일)는 변경할 수 없습니다.
            </span>
          </div>

          {/* 이름 */}
          <div>
            <label htmlFor="profile-name" className="text-caption text-copy block font-medium">
              이름 <span className="text-danger">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="border-line-strong text-ink placeholder:text-subtle focus:border-primary mt-1 min-h-11 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="이름 입력"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label htmlFor="profile-phone" className="text-caption text-copy block font-medium">
              연락처 (휴대폰 번호) <span className="text-danger">*</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              disabled={isSubmitting}
              maxLength={13}
              className="border-line-strong text-ink placeholder:text-subtle focus:border-primary mt-1 min-h-11 w-full rounded-md border bg-white px-3 py-2 font-mono text-sm tabular-nums focus:outline-none"
              placeholder="010-0000-0000"
            />
            <span className="text-subtle mt-1 block text-xs">
              운송 및 긴급 연락 시 사용되는 연락처입니다.
            </span>
          </div>

          {/* 비밀번호 변경 영역 토글 */}
          <div className="border-line border-t pt-3">
            <button
              type="button"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="text-primary hover:text-primary-dark inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              <span>{isChangingPassword ? '▼' : '▶'}</span>
              <span>비밀번호 변경하기</span>
            </button>

            {isChangingPassword && (
              <div className="border-line mt-3 space-y-3 rounded-md border bg-slate-50 p-3.5">
                <div>
                  <label
                    htmlFor="current-password"
                    className="text-caption text-copy block font-medium"
                  >
                    현재 비밀번호 <span className="text-danger">*</span>
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-line-strong text-ink placeholder:text-subtle focus:border-primary mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="현재 비밀번호 입력"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="text-caption text-copy block font-medium"
                  >
                    새 비밀번호 (8자 이상) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-line-strong text-ink placeholder:text-subtle focus:border-primary mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="새 비밀번호 입력"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="text-caption text-copy block font-medium"
                  >
                    새 비밀번호 확인 <span className="text-danger">*</span>
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-line-strong text-ink placeholder:text-subtle focus:border-primary mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="새 비밀번호 다시 입력"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 차주인 경우 차량 정보 관리 바로가기 안내 */}
          {me.role === 'DRIVER' && (
            <div className="border-line rounded-md border bg-blue-50/50 p-3 text-xs text-slate-700">
              <span className="text-ink font-semibold">차량 정보 수정을 원하시나요?</span>
              <p className="text-muted mt-0.5">
                톤수 및 차량 번호는 전용 차량 관리 화면에서 변경할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={handleNavigateVehicle}
                className="text-primary hover:text-primary-dark mt-2 font-semibold underline"
              >
                내 차량 관리 바로가기 →
              </button>
            </div>
          )}

          {/* 오류 및 성공 메시지 */}
          {errorMessage && (
            <div className="bg-danger-soft text-danger rounded-md p-2.5 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-5 font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
