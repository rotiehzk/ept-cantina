# Como contribuir

O projeto está em https://github.com/rotiehzk/ept-cantina. As propostas de alteração são revistas por @rotiehzk antes de serem integradas.

## Preparar o projeto

1. No GitHub, clicar em **Fork** para criar uma cópia na tua conta.
2. Clonar o teu fork, substituindo `TEU_UTILIZADOR` pelo teu nome no GitHub:

   ```sh
   git clone https://github.com/TEU_UTILIZADOR/ept-cantina.git
   cd ept-cantina
   git remote add upstream https://github.com/rotiehzk/ept-cantina.git
   npm run install:ci
   ```

Usar Node.js 24, ou uma versão compatível com o requisito indicado em package.json. Seguir as instruções do README para preparar a base de dados local e abrir a app.

## Propor uma alteração

1. Atualizar a tua cópia e criar uma branch para a alteração:

   ```sh
   git fetch upstream
   git switch -c minha-alteracao upstream/main
   ```

2. Fazer a alteração e verificar o projeto:

   ```sh
   npx tsc --noEmit
   npm run build
   ```

   Se mudares a interface, verificar também o navegador em tamanho de telemóvel. Se mudares as marcações, confirmar as escolhas, recarregar a página e verificar as contagens da cantina com os perfis fictícios.

3. Guardar apenas os ficheiros relacionados com a alteração e enviar a branch para o teu fork:

   ```sh
   git add caminho/do/ficheiro
   git commit -m "Descrever a alteração"
   git push -u origin minha-alteracao
   ```

4. No GitHub, clicar em **Compare & pull request**. Escolher `rotiehzk/ept-cantina` e `main` como destino, explicar o que mudou e como foi verificado.
5. Aguardar a revisão de @rotiehzk. Corrigir eventuais comentários na mesma branch; o pull request atualiza-se automaticamente.

Não incluir NIFs, números de alunos reais, palavras-passe, chaves de API, ficheiros .env ou bases de dados locais. A versão atual usa apenas dados fictícios. Não é necessário acesso à API da escola para contribuir para a demonstração.

## Revisão e publicação

Os colegas propõem alterações através de forks e pull requests. A integração na branch principal é decidida pelo responsável do projeto, depois de rever a proposta e as verificações automáticas. A publicação do site é um passo separado e não acontece automaticamente ao aceitar o pull request.
