# Hotel CineLuz

**Seis quartos, café passado na hora e cinema nos pequenos detalhes.**

O CineLuz é um hotel pequeno, imaginado para receber com calma. Tem uma poltrona para terminar um livro, uma manta perto da janela e bilhetes escritos à mão. Cada quarto foi pensado a partir de um dos seis filmes escolhidos, com atenção às cores, aos objetos e à sensação de estar ali.

Este é um projeto de **banco de dados MongoDB**. O carinho aparece nas descrições dos quartos, nos pedidos das reservas, nos serviços da casa e nas mensagens entre hóspedes e equipe.

## Os seis quartos

| Quarto | Nome | Filme de referência | Um cuidado no ambiente |
| --- | --- | --- | --- |
| 101 | **Boas-Vindas** | Para Wong Foo, Obrigada por Tudo! Julie Newmar | Uma poltrona florida, luz de camarim e um bilhete para chegar como se é. |
| 102 | **Última Volta** | Premonição 3 | Luzes âmbar e uma montanha-russa desenhada à mão, num quarto tranquilo para descansar depois do suspense. |
| 103 | **Lado B** | As Vantagens de Ser Invisível | Livros na cabeceira e cartões em branco para escrever a alguém querido. |
| 201 | **Veludo à Meia-Noite** | Elvira: A Rainha das Trevas | Veludo violeta, estrelas prateadas e um escurinho cheio de personalidade. |
| 202 | **Luz do Deserto** | Os Dez Mandamentos (1956) | Linho em tom de areia, cobre e uma luz dourada que acolhe ao entardecer. |
| 203 | **Janela de Chuva** | Lua Nova | Madeira escura, uma pequena floresta pintada e uma manta na poltrona da janela. |

As descrições são interpretações decorativas criadas para este hotel fictício.

## Um projeto pequeno

São **23 documentos em oito coleções**, com os mesmos nomes e relacionamentos do esquema solicitado.

| Coleção | Quantidade | O que guarda |
| --- | ---: | --- |
| `hospedes` | 3 | Pessoas, endereço e preferências |
| `quartos` | 6 | Um quarto para cada filme |
| `reservas` | 3 | Duas visitas concluídas e uma futura |
| `hospedagens` | 2 | Estadias realizadas e serviços consumidos |
| `pagamentos` | 2 | Contas e métodos de pagamento |
| `funcionarios` | 2 | Rosa e Miguel, com turnos e permissões |
| `servicos` | 3 | Café da Manhã da Casa, Pipoca e Manta, Chá ao Entardecer |
| `feedbacks` | 2 | Comentários dos hóspedes e resposta da equipe |

As pessoas, os contatos e os valores são fictícios. CPFs e telefones são marcadores de demonstração. O cenário dos dados se passa em **20 de abril de 2025**, antes da terceira reserva.

## Como abrir o banco

Você precisa do **MongoDB Server em execução** e do **mongosh** instalado. O Compass pode ser usado para visualizar o banco depois. Instalar apenas o Compass não inicia um servidor.

1. Extraia o ZIP e abra esta pasta no VS Code.
2. Abra o terminal na pasta que contém este README.
3. Execute:

```bash
mongosh "mongodb://localhost:27017" --file banco.js
```

O script escolhe o banco **`hotel_cineluz_intimista`**, cria as oito coleções com validadores e índices únicos, carrega os dados e confere as relações e os valores. Esse nome mantém esta base pequena separada da versão anterior do projeto.

Para executar os seis exemplos de consulta:

```bash
mongosh "mongodb://localhost:27017" --file consultas.js
```

No Compass, conecte-se a `mongodb://localhost:27017`, atualize a lista e abra `hotel_cineluz_intimista`. Os arquivos JSON também estão separados por coleção em `dados/`.

Repetir `banco.js` preserva os documentos com os mesmos IDs, sem duplicá-los. Use um banco vazio na primeira carga. O script não apaga documentos.

## A parte técnica, com cuidado

- **Endereço e preferências** ficam embutidos no hóspede.
- **Comodidades e características** ficam no quarto.
- **Reservas** referenciam hóspede e quarto e preservam cópias dos dados da contratação em `hospede_snapshot` e `quarto_snapshot`.
- **Consumos** ficam embutidos na hospedagem, com nome e preço do momento do consumo.
- **Pagamentos** guardam as parcelas e permitem combinar métodos, como cartão e Pix.
- **Turnos e permissões** ficam no funcionário; **horários e tags**, no serviço.
- **Avaliações** têm coleção própria, com notas detalhadas e resposta da equipe.
- IDs são **ObjectId** válidos; datas são **Date**; dinheiro é **Decimal128**.

O [modelo técnico](MODELO.md) descreve todos os campos. Os seis exemplos em `consultas.js` mostram filtros, projeção, ordenação, documentos embutidos, relacionamento com `$lookup` e soma com `$group`.

Na base original desta versão, as consultas retornam seis quartos; três disponíveis até R$ 280; uma reserva futura; duas hospedagens; **R$ 1.130,00 recebidos**; e um comentário ainda sem resposta.

## Arquivos

| Arquivo ou pasta | Função |
| --- | --- |
| `dados/` | Oito arquivos JSON, um por coleção |
| `banco.js` | Criação, carga e conferência do banco |
| `consultas.js` | Seis exemplos comentados, somente de leitura |

## Conferência da entrega

Os arquivos foram conferidos quanto a campos, tipos representados em Extended JSON, referências, datas, sobreposição de reservas e contas. A sintaxe dos scripts também foi verificada. O ambiente de preparação não tinha servidor MongoDB: a execução nele ainda precisa ser feita com o comando acima.

O esquema de dados e os cenários de carga foram exercitados em uma simulação local das chamadas do shell; isso não substitui a execução no MongoDB.
