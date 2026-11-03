import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="center-page">
      <h1>페이지를 찾을 수 없습니다</h1>
      <Link to="/">처음으로</Link>
    </main>
  );
}
