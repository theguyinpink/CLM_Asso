import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fichier introuvable : ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function write(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  const backupPath = path.join(
    root,
    ".clm-patch-backups",
    "payment-legal",
    relativePath,
  );

  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absolutePath, backupPath);
  }

  fs.writeFileSync(absolutePath, content, "utf8");
  console.log(`✓ ${relativePath}`);
}

function ignoreBackupDirectory() {
  const gitignorePath = path.join(root, ".gitignore");
  const entry = ".clm-patch-backups/";
  const current = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";

  if (!current.split(/\r?\n/).includes(entry)) {
    const separator = current && !current.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(
      gitignorePath,
      `${current}${separator}${entry}\n`,
      "utf8",
    );
  }
}

function patchAppLayout() {
  const file = "src/components/app/AppLayout.tsx";
  let source = read(file);

  if (!source.includes("PaymentPastDueBanner")) {
    const headerImport = /import AppHeader from ["']\.\/AppHeader["'];/;

    if (!headerImport.test(source)) {
      throw new Error("Import AppHeader introuvable dans AppLayout.tsx");
    }

    source = source.replace(
      headerImport,
      (match) =>
        `${match}\nimport PaymentPastDueBanner from "./PaymentPastDueBanner";`,
    );

    const headerComponent = /(<AppHeader[\s\S]*?\/>)/;

    if (!headerComponent.test(source)) {
      throw new Error("Composant AppHeader introuvable dans AppLayout.tsx");
    }

    source = source.replace(
      headerComponent,
      (match) => `${match}\n\n          <PaymentPastDueBanner />`,
    );
  }

  write(file, source);
}

function patchSidebar() {
  const file = "src/components/app/AppSidebar.tsx";
  let source = read(file);

  if (!source.includes("CircleHelp")) {
    const lucideImport = /import\s*\{([\s\S]*?)\}\s*from ["']lucide-react["'];/;
    const match = source.match(lucideImport);

    if (!match) {
      throw new Error("Import lucide-react introuvable dans AppSidebar.tsx");
    }

    const updatedImport = match[0].replace("{", "{\n  CircleHelp,");
    source = source.replace(match[0], updatedImport);
  }

  if (!source.includes('to="/app/aide"')) {
    const planMarker = '<div className="app-sidebar__plan">';

    if (!source.includes(planMarker)) {
      throw new Error("Bloc app-sidebar__plan introuvable dans AppSidebar.tsx");
    }

    const supportLink = `
      <NavLink
        to="/app/aide"
        onClick={onClose}
        className={({ isActive }) =>
          isActive
            ? "app-sidebar__support app-sidebar__support--active"
            : "app-sidebar__support"
        }
      >
        <CircleHelp size={17} strokeWidth={1.9} />
        <span>Aide et informations légales</span>
      </NavLink>

      `;

    source = source.replace(planMarker, `${supportLink}${planMarker}`);
  }

  write(file, source);
}

function patchAppRoutes() {
  const file = "src/App.tsx";
  let source = read(file);

  if (!source.includes("CompactLegalFooter")) {
    const backToTopImport = /import BackToTopButton from ["']\.\/components\/BackToTopButton["'];/;

    if (!backToTopImport.test(source)) {
      throw new Error("Import BackToTopButton introuvable dans App.tsx");
    }

    source = source.replace(
      backToTopImport,
      (match) =>
        `${match}\nimport CompactLegalFooter from "./components/CompactLegalFooter";`,
    );
  }

  if (!source.includes("LegalHelpPage")) {
    const settingsDeclaration =
      /const SettingsPage = lazy\([\s\S]*?\);/;

    if (!settingsDeclaration.test(source)) {
      throw new Error("Déclaration SettingsPage introuvable dans App.tsx");
    }

    source = source.replace(
      settingsDeclaration,
      (match) =>
        `${match}\nconst LegalHelpPage = lazy(() => import("./pages/app/LegalHelpPage"));`,
    );
  }

  if (!source.includes('path="aide"')) {
    const settingsRoute =
      /(<Route\s+path=["']parametres["'][\s\S]*?\/>)/;

    if (!settingsRoute.test(source)) {
      throw new Error("Route Paramètres introuvable dans App.tsx");
    }

    source = source.replace(
      settingsRoute,
      (match) =>
        `${match}\n\n              <Route path="aide" element={<LegalHelpPage />} />`,
    );
  }

  if (!source.includes("<CompactLegalFooter />")) {
    if (source.includes("<AppRoutes />")) {
      source = source.replace(
        "<AppRoutes />",
        "<AppRoutes />\n      <CompactLegalFooter />",
      );
    } else if (source.includes("<BackToTopButton />")) {
      source = source.replace(
        "<BackToTopButton />",
        "<CompactLegalFooter />\n      <BackToTopButton />",
      );
    } else {
      throw new Error("Point d’insertion du footer introuvable dans App.tsx");
    }
  }

  write(file, source);
}

function patchAppCss() {
  const file = "src/styles/app.css";
  let source = read(file);
  const marker = "CLM ASSO — PAIEMENT EN RETARD ET AIDE LÉGALE";

  if (!source.includes(marker)) {
    source += `

/* =========================================================
   CLM ASSO — PAIEMENT EN RETARD ET AIDE LÉGALE
   ========================================================= */

.app-payment-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px solid #f0c36c;
  background: #fff8e7;
  color: #72510c;
}

.app-payment-warning__icon {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #ffedbc;
  color: #b06d00;
}

.app-payment-warning__content {
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 3px;
}

.app-payment-warning__content strong {
  color: #674700;
  font-size: 10px;
}

.app-payment-warning__content span,
.app-payment-warning__owner-note {
  color: #81621e;
  font-size: 8px;
  line-height: 1.5;
}

.app-payment-warning__action {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding-inline: 13px;
  border: 1px solid #d79213;
  border-radius: 9px;
  background: #ffffff;
  color: #8a5a00;
  font-size: 8px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.app-payment-warning__action:hover,
.app-payment-warning__action:focus-visible {
  background: #fff3cf;
}

.app-sidebar__support {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 8px 10px;
  border-radius: 9px;
  color: #8090a3;
  font-size: 8px;
  font-weight: 700;
  text-decoration: none;
}

.app-sidebar__support:hover,
.app-sidebar__support:focus-visible,
.app-sidebar__support--active {
  background: rgb(255 255 255 / 7%);
  color: #ffffff;
}

.app-sidebar__plan {
  margin-top: 0;
}

@media (max-width: 720px) {
  .app-payment-warning {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 11px 13px;
  }

  .app-payment-warning__content {
    width: calc(100% - 50px);
  }

  .app-payment-warning__action,
  .app-payment-warning__owner-note {
    width: 100%;
    margin-left: 46px;
  }
}
`;
  }

  write(file, source);
}

try {
  ignoreBackupDirectory();
  patchAppLayout();
  patchSidebar();
  patchAppRoutes();
  patchAppCss();

  console.log("\nInstallation frontend terminée.");
  console.log(
    "Exécute maintenant la migration 016 dans Supabase, puis npm run lint et npm run build.",
  );
} catch (error) {
  console.error("\nInstallation interrompue :", error.message);
  process.exitCode = 1;
}
