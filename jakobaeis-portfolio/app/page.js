import Wall from './Wall';
import { getItems } from '../lib/store';
import { SITE_NAME, INSTAGRAM, TAGLINE } from '../lib/site';

export const revalidate = 3600;

export default async function Home() {
  const items = await getItems();

  return (
    <main className="page">
      <header className="top">
        <h1 className="mark">{SITE_NAME}</h1>
        <p className="tagline">{TAGLINE}</p>
      </header>

      <Wall items={items} />

      <footer className="foot">
        <a className="ig" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">
          @{INSTAGRAM}
        </a>
        <a className="adminlink" href="/admin" rel="nofollow">
          Admin
        </a>
      </footer>
    </main>
  );
}
