// 담당 도메인이 화면을 만들기 전까지 쓰는 자리 표시 페이지
export default function PlaceholderPage({ title }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">준비 중인 화면입니다.</p>
    </section>
  );
}
