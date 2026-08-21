import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHome(): string {
    return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#102a43">
    <title>333 | Votre espace numérique</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #102a43;
        --muted: #486581;
        --paper: #f4f7f9;
        --accent: #f08c46;
        --line: #d9e2ec;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 85% 15%, #d9f0ef 0, transparent 32%), var(--paper);
        color: var(--ink);
        font-family: Georgia, 'Times New Roman', serif;
      }
      main { width: min(1080px, calc(100% - 40px)); margin: auto; padding: 28px 0 56px; }
      nav { display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif; }
      .mark { font-size: 1.45rem; font-weight: 800; letter-spacing: .08em; }
      .status { color: #176b5d; font-size: .82rem; font-weight: 700; }
      .status::before { content: ''; display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: #42b883; }
      section { display: grid; grid-template-columns: 1.1fr .9fr; gap: 72px; align-items: center; padding: 13vh 0 10vh; }
      h1 { max-width: 650px; margin: 0 0 24px; font-size: clamp(3.6rem, 9vw, 7.4rem); line-height: .9; letter-spacing: -.045em; font-weight: 700; }
      h1 em { color: var(--accent); font-weight: 400; }
      p { max-width: 520px; color: var(--muted); font: 1.12rem/1.65 Arial, sans-serif; }
      .panel { position: relative; padding: 34px; border: 1px solid var(--line); background: rgba(255,255,255,.7); box-shadow: 18px 18px 0 #d9e2ec; }
      .panel::before { content: '333'; position: absolute; top: -22px; right: 24px; color: var(--accent); font: 700 1rem Arial, sans-serif; letter-spacing: .14em; }
      .panel h2 { margin: 0 0 14px; font-size: 2rem; }
      .panel p { margin-bottom: 24px; font-size: .98rem; }
      a { display: inline-block; padding: 14px 20px; background: var(--ink); color: white; text-decoration: none; font: 700 .9rem Arial, sans-serif; }
      a:hover, a:focus-visible { background: var(--accent); }
      footer { border-top: 1px solid var(--line); padding-top: 20px; color: var(--muted); font: .8rem Arial, sans-serif; }
      @media (max-width: 720px) {
        main { width: min(100% - 28px, 560px); padding-top: 20px; }
        section { display: block; padding: 15vh 0 12vh; }
        h1 { font-size: clamp(3.5rem, 19vw, 6rem); }
        .panel { margin: 56px 10px 0 0; }
      }
    </style>
  </head>
  <body>
    <main>
      <nav><div class="mark">333</div><div class="status">Service en ligne</div></nav>
      <section>
        <div>
          <h1>Simple.<br><em>Utile.</em><br>Présent.</h1>
          <p>Bienvenue sur 333, un espace numérique clair et fiable, prêt à accompagner vos prochains projets.</p>
        </div>
        <div class="panel">
          <h2>Tout est prêt.</h2>
          <p>Le service fonctionne correctement et son API est disponible pour les intégrations à venir.</p>
          <a href="/health">Vérifier le service</a>
        </div>
      </section>
      <footer>333 · Une base solide pour la suite</footer>
    </main>
  </body>
</html>`;
  }

  @Get('health')
  getHealth(): Promise<{ status: string; service: string; database: string }> {
    return this.appService.getHealth();
  }
}
