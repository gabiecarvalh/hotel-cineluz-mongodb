// Seis exemplos curtos, somente de leitura: mongosh --file consultas.js
(() => {
  const banco = db.getSiblingDB("hotel_cineluz_intimista");
  const mostrar = (titulo, cursor) => { print("\n" + titulo); printjson(cursor.toArray()); };

  // Projeção e ordenação: os seis quartos e seus filmes.
  mostrar("1. Os seis cantinhos do CineLuz", banco.quartos.find(
    {}, { _id: 0, numero: 1, nome_tema: 1, tema_filme: 1 }
  ).sort({ numero: 1 }));

  // Filtro composto: disponibilidade atual e valor de até R$ 280.
  mostrar("2. Quartos disponíveis até R$ 280", banco.quartos.find(
    { status: "disponivel", preco_diaria: { $lte: NumberDecimal("280.00") } },
    { _id: 0, nome_tema: 1, preco_diaria: 1 }
  ).sort({ preco_diaria: 1 }));

  // Documento embutido: a informação preservada na reserva.
  mostrar("3. Uma visita por vir", banco.reservas.find(
    { status: "confirmada" },
    { _id: 0, "hospede_snapshot.nome": 1, "quarto_snapshot.nome_tema": 1, data_checkin: 1 }
  ));

  // $lookup: relaciona a hospedagem ao cadastro atual do hóspede.
  mostrar("4. Quem já ficou por aqui", banco.hospedagens.aggregate([
    { $lookup: { from: "hospedes", localField: "hospede_id", foreignField: "_id", as: "hospede" } },
    { $unwind: "$hospede" },
    { $project: { _id: 0, nome: "$hospede.nome", total_geral: 1 } },
    { $sort: { nome: 1 } }
  ]));

  // $unwind e $group: somam apenas pagamentos aprovados.
  mostrar("5. Total recebido", banco.pagamentos.aggregate([
    { $unwind: "$parcelas" },
    { $match: { "parcelas.status": "aprovado" } },
    { $group: { _id: null, recebido: { $sum: "$parcelas.valor" } } },
    { $project: { _id: 0, recebido: 1 } }
  ]));

  // Campo opcional com null: a avaliação que ainda merece uma resposta.
  mostrar("6. Um comentário esperando cuidado", banco.feedbacks.find(
    { visivel: true, resposta_hotel: null }, { _id: 0, comentario: 1, nota_geral: 1 }
  ));
})();
