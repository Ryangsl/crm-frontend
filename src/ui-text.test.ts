import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Texto de tela em portugues correto: estas palavras apareciam sem acento em rotulos, avisos e
// mensagens de erro ("Nao foi possivel", "Historico", "Indisponivel"). O teste le o codigo das telas
// e falha se uma delas voltar fora de comentario. Comentarios do codigo seguem sem acento.
const FORBIDDEN =
  /\b(Nao|nao|Voce|voce|possivel|usuario|usuarios|Usuario|horario|Horario|permissao|permissoes|sessao|acao|acoes|Acao|Acoes|historico|Historico|interacao|interacoes|Interacao|Interacoes|Indisponivel|indisponivel|Disponivel|responsavel|Responsavel|notificacao|notificacoes|Notificacoes|liberacao|liberacoes|Liberacao|restricao|Restricao|configuracao|configuracoes|distribuicao|expiracao|descricao|observacao|edicao|criacao|exclusao|Saida|Almoco|Concluida|Anotacao|Pagina|tambem|invalido|invalida|obrigatorio|obrigatoria|Obrigatorio)\b/;

const SRC = __dirname;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.|testing\.tsx?$/.test(entry)) return [];
    return [path];
  });
}

// Remove comentarios de bloco (inclusive `{/* ... */}` em JSX) e de linha, preservando as quebras.
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => line.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');
}

describe('textos de tela', () => {
  it('não usam palavras sem acento', () => {
    const offenders = sources(SRC).flatMap((file) =>
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .flatMap((line, index) => {
          const match = FORBIDDEN.exec(line);
          return match ? [`${relative(SRC, file)}:${index + 1} "${match[0]}"`] : [];
        }),
    );
    expect(offenders).toEqual([]);
  });
});
