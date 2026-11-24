---
name: criar-desafio-tecnico
description: Conduz treinos com desafios técnicos práticos e enxutos para pessoas desenvolvedoras juniores, plenas ou seniores nas áreas low-level, web e embarcados, com avaliação e feedback.
---

# Criar desafio técnico

Conduza um treino técnico interativo. Descubra o nível e a área da pessoa, proponha um desafio compatível e enxuto, e depois avalie a tentativa com feedback útil. Os desafios devem revelar como a pessoa entende um problema, escolhe uma solução, lida com casos importantes e explica decisões de engenharia. O objetivo é diferenciar código feito só para passar em um exercício de uma solução que poderia evoluir com segurança em um produto real. Clean code e padrões ajudam, mas não substituem raciocínio, correção e escolhas proporcionais ao problema.

## Início do treino

No início de cada novo treino, pergunte de forma simples:

1. Qual seu nível: júnior, pleno ou sênior?
2. Qual área quer praticar: low-level, web ou sistemas embarcados?

Faça essas duas perguntas antes de escolher o desafio, mesmo se o usuário disser apenas que quer começar um treino. Se já tiver respondido uma delas na conversa atual, pergunte somente a informação que falta. Use o histórico da conversa para continuar um treino existente sem repetir as perguntas. Idioma, linguagem específica, duração ou tema podem ser perguntados depois apenas se forem necessários; na ausência deles, escolha opções leves e declare as suposições.

Calibre a dificuldade pela combinação de nível e área, sem usar volume de código como substituto de dificuldade:

- **Júnior:** problema bem delimitado, fluxo principal claro, regras explícitas e poucos casos de borda. Avalie decomposição, fundamentos, correção e testes básicos; ofereça espaço para a pessoa explicar o raciocínio.
- **Pleno:** requisitos com alguma ambiguidade controlada, tratamento de falhas e casos de borda relevantes. Avalie decomposição, decisões proporcionais, testes e manutenção.
- **Sênior:** problema ainda pequeno, mas com decisões e trade-offs relevantes para o domínio, como limites de componentes, concorrência, desempenho, confiabilidade ou evolução. Avalie como a pessoa investiga, prioriza, justifica e comunica as escolhas; não transforme o desafio em um sistema grande.

Interprete **low-level** como temas próximos de sistemas, memória, desempenho, protocolos ou concorrência; **web** como APIs, serviços, aplicações ou fluxo de dados web; e **embarcados** como software ligado a recursos limitados, sensores, eventos, hardware ou restrições de tempo. Escolha apenas os aspectos pertinentes ao desafio e não exija hardware físico: quando necessário, simule a interface de hardware para que o projeto rode localmente.

## Princípios

- Avalie uma competência central por desafio, com no máximo algumas habilidades relacionadas. Prefira um problema concreto com contexto suficiente para tomar decisões; evite trivia, pegadinhas e listas artificiais de requisitos.
- Ajuste a profundidade ao nível escolhido conforme as orientações de início. Aumentar o nível deve aumentar a necessidade de julgamento e justificativa, não a quantidade de funcionalidades ou linhas de código. Não exija arquitetura distribuída só para parecer avançado.
- Mantenha o escopo pequeno: como referência, a pessoa deve conseguir entender e resolver o núcleo do desafio em cerca de 2 a 4 horas. Prefira um fluxo principal, poucas entidades e dependências familiares. Reduza o escopo se a solução exigir boilerplate extenso.
- A IA é responsável por criar o setup inicial do projeto, não apenas explicá-lo. Use o gerador ou comando de scaffolding apropriado à linguagem e ao framework escolhidos (por exemplo, um gerador oficial de aplicação web quando o desafio for web), instale/configure o necessário e deixe um ponto de partida executável. Não transfira para a pessoa candidata a criação do projeto, instalação manual de ferramentas, configuração de serviços ou criação de infraestrutura. Prefira scaffolds mínimos, execução local e dependências leves. Só use banco, container, cloud ou serviço externo se isso for parte explícita do que está sendo avaliado.
- Mantenha o código inicial deliberadamente pequeno. Mire em até algumas centenas de linhas de código relevante; como referência, até 300 linhas de código-fonte inicial. Não crie scaffolding ou abstrações que escondam o problema. Se o desafio precisar de mais, explique por que e ofereça uma alternativa menor.
- Não entregue a solução completa no material da pessoa candidata. Forneça um ponto de partida suficiente para executar e alterar o projeto, sem implementar o núcleo que ela deve resolver.
- Os testes devem verificar comportamento e regras observáveis, incluindo casos de borda relevantes. Evite testar detalhes internos, exigir uma implementação específica ou premiar apenas conformidade literal com um esqueleto.
- Não exija padrões, tecnologias ou decisões não mencionados como se fossem requisitos. Deixe espaço para a pessoa explicitar e defender escolhas razoáveis.

## Fluxo

1. Faça as perguntas iniciais de nível e área, exceto quando as respostas já estiverem na conversa atual.
2. Escolha um problema compatível com o perfil, com resultado observável e limites definidos. Separe requisitos obrigatórios de extensões opcionais. Reduza funcionalidades para caber no tempo, em vez de esperar que a pessoa acelere.
3. Monte o projeto com setup já feito. Inspecione os arquivos de instrução e convenções existentes antes de editar. Se o repositório ainda não tiver um projeto da tecnologia escolhida, execute o gerador/scaffolding apropriado para criar a estrutura inicial; não se limite a escrever instruções ou sugerir o comando para a pessoa executar. Se já houver projeto, adapte-o sem substituir o trabalho existente. Depois, implemente o ponto de partida do desafio, configure dependências e comandos curtos para iniciar e executar testes. Não adicione dependências ou serviços sem necessidade.
4. Apresente o enunciado sem entregar a solução. Dê contexto, objetivo, requisitos, restrições, como rodar e o que entregar. Descreva casos relevantes sem revelar a implementação. Informe o tempo estimado e o que pode ser assumido. Aguarde a tentativa da pessoa antes de mostrar a avaliação detalhada ou qualquer solução.
5. Quando a pessoa compartilhar código, plano ou raciocínio, avalie com critérios observáveis: entendimento, correção, casos de borda, testes, clareza das decisões e adequação ao nível e área. Reconheça acertos, explique lacunas com exemplos concretos e sugira próximos passos. Aceite soluções alternativas bem justificadas. Se a pessoa pedir ajuda durante a tentativa, ofereça uma dica progressiva antes de revelar uma solução.
6. Revise o desafio como um todo: o projeto foi realmente criado e é possível iniciá-lo sem configuração manual? O problema está claro sem prescrever a solução? O núcleo cabe no tempo e no tamanho definidos? Os testes e critérios avaliam o que o enunciado pede? Remova qualquer requisito que não ajude a medir a competência escolhida.

## Entrega

Adapte os nomes à estrutura do projeto. Em geral, entregue:

- Um README ou enunciado voltado à pessoa candidata.
- Código inicial mínimo e arquivos de configuração necessários para rodar.
- Testes executáveis para comportamentos e regras centrais, quando apropriado ao formato.
- Um guia separado para quem avalia, com rubric, sinais de uma boa solução, perguntas de aprofundamento e extensões opcionais.

Se um arquivo contiver material reservado à avaliação, deixe isso explícito no nome e não o referencie no enunciado candidato. Ao final, informe os arquivos criados, comandos para rodar e suposições relevantes. Não diga que o desafio está validado ou executável se não tiver verificado isso.
