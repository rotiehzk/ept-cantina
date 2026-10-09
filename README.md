# EPT · Cantina escolar

Web app responsiva em português, inspirada nas cores do website da Escola Profissional de Trancoso. Funciona no navegador de Android e iOS e inclui manifest, ícones, suporte ao ecrã principal e página offline. As marcações exigem internet.

## Funcionalidades
- Ementa semanal: prato do dia, opção vegetariana, sopa e sobremesa.
- Marcação por dia: prato do dia, vegetariano ou não almoçar.
- Confirmação explícita, alteração e resumo das escolhas.
- Painel da cantina: quantidades confirmadas por dia e por opção, respostas em falta e exportação CSV.
- Edição da ementa de demonstração.
- Três perfis fictícios para testar o fluxo e as contagens.
- Persistência no servidor com Cloudflare D1. As demonstrações são isoladas por utilizador autenticado na plataforma.

## Estado desta versão
Demonstração funcional e privada. Não está ligada à API da escola e não recebe números de aluno, NIFs ou palavras-passe reais. O formulário de acesso apresenta o modelo pretendido; o campo de palavra-passe fica desativado até existir a integração. A troca entre aluno e cantina é uma simulação, e não uma autorização de acesso institucional.

## Desenvolvimento
Node.js >=22.13.0. Instalar com npm ci. Gerar migrações com npm run db:generate e compilar com npm run build. A pré-visualização usa npm run dev. Em Windows, se o shim do npm não funcionar, pode executar diretamente node scripts/run-framework.mjs dev ou build.

A base de dados local deve receber as migrações Drizzle, em ordem, através do Wrangler. A publicação Sites aplica as migrações de produção. O acesso local de demonstração pode ser ativado por /signin-with-chatgpt?return_to=/.

## Integração futura com a escola
Obter a documentação da API, os endpoints de autenticação e o modelo de identificação de alunos e funcionários. Validar o login apenas no servidor, não guardar o NIF no navegador e aplicar autorização de aluno/cantina em todos os endpoints. Substituir os perfis fictícios pelo identificador estável devolvido pela escola e partilhar uma única base de dados institucional. O NIF é um identificador previsível: recomenda-se que a escola disponibilize uma palavra-passe própria ou o seu login institucional.

Confirmar com a escola o prazo de marcação, horário, feriados, semanas letivas e tipo de pratos. Atualmente a app apresenta as próximas quatro semanas, com prazo de exemplo às 18h UTC do dia útil anterior e horário de almoço de exemplo das 12h às 14h. As ementas são fictícias e não incluem informação oficial de alergénios.

## Ficheiros principais
- app/cantina.tsx: interface e interações.
- app/globals.css: design e adaptação móvel.
- app/api/demo/route.ts: leitura e gravação, validação e isolamento por utilizador.
- app/domain.ts: perfis fictícios, semanas, prazos e ementas de exemplo.
- db/schema.ts e drizzle/: modelo de dados e migrações.
- public/manifest.webmanifest e public/sw.js: ecrã principal e fallback offline.

## Validação
Compilação e verificação TypeScript; confirmação de escolhas, persistência após recarregar, contagens por opção, perfis e edição de ementa; verificação de layouts móveis em navegador. Não foi realizado teste num dispositivo físico Android ou iOS.
