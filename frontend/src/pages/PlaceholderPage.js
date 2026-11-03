// 담당 도메인이 화면을 만들기 전까지 쓰는 자리 표시 페이지
export default function PlaceholderPage({ title }) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <p className="text-gray-500">준비 중인 화면입니다.</p>
    </section>
  );
}
