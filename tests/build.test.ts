import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

describe('Production build and deployment artifact verification', () => {
  it('generates dist/index.html referencing bundled /assets/*.js rather than /src/main.tsx', () => {
    const distIndexPath = path.join(ROOT_DIR, 'dist', 'index.html');
    expect(fs.existsSync(distIndexPath)).toBe(true);

    const html = fs.readFileSync(distIndexPath, 'utf8');
    expect(html).not.toContain('/src/main.tsx');
    expect(html).toMatch(/src="\/assets\/[^"]+\.js"/);
    expect(html).toMatch(/href="\/assets\/[^"]+\.css"/);
  });

  it('preserves GitHub Pages CNAME, SPA .htaccess, and deploy workflow configuration', () => {
    const cnamePath = path.join(ROOT_DIR, 'public', 'CNAME');
    expect(fs.existsSync(cnamePath)).toBe(true);
    expect(fs.readFileSync(cnamePath, 'utf8').trim()).toBe('primehousing.co.in');

    const htaccessPath = path.join(ROOT_DIR, 'public', '.htaccess');
    expect(fs.existsSync(htaccessPath)).toBe(true);
    expect(fs.readFileSync(htaccessPath, 'utf8')).toContain('index.html');

    const deployWorkflow = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
    expect(fs.existsSync(deployWorkflow)).toBe(true);
    const workflowYaml = fs.readFileSync(deployWorkflow, 'utf8');
    expect(workflowYaml).toContain('npx vite build');
    expect(workflowYaml).toContain('cp dist/index.html dist/404.html');
  });

  it('includes hardened firestore.rules, storage.rules, and firebase.json', () => {
    const firestoreRulesPath = path.join(ROOT_DIR, 'firestore.rules');
    const storageRulesPath = path.join(ROOT_DIR, 'storage.rules');
    const firebaseJsonPath = path.join(ROOT_DIR, 'firebase.json');

    expect(fs.existsSync(firestoreRulesPath)).toBe(true);
    expect(fs.existsSync(storageRulesPath)).toBe(true);
    expect(fs.existsSync(firebaseJsonPath)).toBe(true);

    const firestoreRules = fs.readFileSync(firestoreRulesPath, 'utf8');
    expect(firestoreRules).toContain('roleRank()');
    expect(firestoreRules).toContain('allow update, delete: if false;');

    const storageRules = fs.readFileSync(storageRulesPath, 'utf8');
    expect(storageRules).toContain('roleRank()');
    expect(storageRules).toContain('allow create: if (resource == null || isEditorOrAbove()) && isValidImage();');
    expect(storageRules).toContain('match /{allPaths=**}');
  });

  it('preserves Express server.ts without unrequested routes', () => {
    const serverPath = path.join(ROOT_DIR, 'server.ts');
    expect(fs.existsSync(serverPath)).toBe(true);
    const serverSource = fs.readFileSync(serverPath, 'utf8');
    expect(serverSource).toContain("app.get('/api/health'");
    expect(serverSource).toContain('process.env.PORT');
  });
});
