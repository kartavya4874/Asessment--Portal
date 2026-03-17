import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, 'src');

function getImportPath(filePath) {
    let relPath = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'errorHandler'));
    relPath = relPath.replace(/\\/g, '/');
    return relPath.startsWith('.') ? relPath : './' + relPath;
}

const pattern = /toast\.error\(\s*err\.response\?\.data\?\.detail\s*\|\|\s*(.*?)\s*\)/g;

let count = 0;
function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.jsx')) {
            let content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('err.response?.data?.detail') && content.includes('toast.error')) {
                const newContent = content.replace(pattern, (match, p1) => {
                    return `toast.error(getErrorDetail(err, ${p1}))`;
                });
                if (newContent !== content) {
                    const importStmt = `import { getErrorDetail } from '${getImportPath(filePath)}';\n`;
                    let lines = newContent.split('\n');
                    let lastImportIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].trim().startsWith('import ')) {
                            lastImportIndex = i;
                        }
                    }
                    if (lastImportIndex !== -1) {
                        lines.splice(lastImportIndex + 1, 0, importStmt.trim());
                    } else {
                        lines.unshift(importStmt.trim());
                    }
                    const finalContent = lines.join('\n');
                    fs.writeFileSync(filePath, finalContent, 'utf-8');
                    count++;
                    console.log('Fixed', file);
                }
            }
        }
    }
}

walk(srcDir);
console.log('Total fixed:', count);
