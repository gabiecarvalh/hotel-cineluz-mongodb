// Execute na pasta do README: mongosh --file banco.js
(() => {
  const fs = require("fs");
  const path = require("path");
  const banco = db.getSiblingDB("hotel_cineluz_intimista");
  const texto = { bsonType: "string" };
  const id = { bsonType: "objectId" };
  const data = { bsonType: "date" };
  const booleano = { bsonType: "bool" };
  const inteiro = { bsonType: "int", minimum: 0 };
  const positivo = { bsonType: "int", minimum: 1 };
  const moeda = { bsonType: "decimal", minimum: 0 };
  const nota = { bsonType: ["int", "double"], minimum: 1, maximum: 5 };
  const opcoes = (...valores) => ({ bsonType: "string", enum: valores });
  const array = itens => ({ bsonType: "array", items: itens });
  const objeto = (properties, required = Object.keys(properties)) => ({
    bsonType: "object", required, properties, additionalProperties: false
  });
  const nulo = esquema => ({ ...esquema, bsonType: [esquema.bsonType, "null"] });

  // Os oito documentos do modelo original, com somente dois campos temáticos novos.
  const esquemas = {
    hospedes: objeto({
      _id: id, nome: texto, cpf: texto, email: texto, telefone: texto,
      data_nascimento: data, nacionalidade: texto,
      endereco: objeto({ logradouro: texto, cidade: texto, estado: texto, cep: texto, pais: texto }),
      preferencias: objeto({ tipo_quarto: opcoes("standard", "deluxe", "suite"), andar_alto: booleano, fumante: booleano, cama: texto }),
      data_cadastro: data, ativo: booleano
    }),
    quartos: objeto({
      _id: id, numero: texto, andar: inteiro, tipo: opcoes("standard", "deluxe", "suite"), categoria: texto,
      nome_tema: texto, tema_filme: texto, capacidade_max: positivo, preco_diaria: moeda, descricao: texto,
      comodidades: array(texto), caracteristicas: objeto({ vista: texto, banheira: booleano, varanda: booleano, area_m2: positivo }),
      status: opcoes("disponivel", "ocupado", "manutencao", "em_limpeza"), fotos: array(texto), ultima_limpeza: data
    }),
    reservas: objeto({
      _id: id, hospede_id: id, hospede_snapshot: objeto({ nome: texto, email: texto, telefone: texto }),
      quarto_id: id, quarto_snapshot: objeto({ numero: texto, tipo: texto, nome_tema: texto, tema_filme: texto, preco_diaria: moeda }),
      data_checkin: data, data_checkout: data, num_noites: positivo, num_hospedes: positivo, valor_total: moeda,
      status: opcoes("confirmada", "cancelada", "checkin_realizado", "finalizada"), canal: texto, codigo_reserva: texto,
      observacoes: texto, data_criacao: data, data_atualizacao: data
    }),
    hospedagens: objeto({
      _id: id, reserva_id: id, hospede_id: id, quarto_id: id, checkin_real: data, checkout_real: nulo(data),
      status: opcoes("em_andamento", "encerrada"), funcionario_checkin_id: id, funcionario_checkout_id: nulo(id),
      servicos_consumidos: array(objeto({ servico_id: id, nome: texto, quantidade: positivo, preco_unitario: moeda, total: moeda, data })),
      total_servicos: moeda, total_diarias: moeda, total_geral: moeda, observacoes: texto
    }),
    pagamentos: objeto({
      _id: id, hospedagem_id: id, reserva_id: id, hospede_id: id, valor_total: moeda,
      status: opcoes("pago", "parcial", "pendente", "estornado"), data_pagamento: nulo(data),
      parcelas: array(objeto({ metodo: texto, bandeira: texto, valor: moeda, num_parcelas: positivo, status: opcoes("aprovado", "pendente", "estornado"), transacao_id: texto },
        ["metodo", "valor", "num_parcelas", "status", "transacao_id"])),
      nota_fiscal: nulo(texto), data_criacao: data
    }),
    funcionarios: objeto({
      _id: id, nome: texto, cpf: texto, email: texto, telefone: texto, cargo: texto, departamento: texto,
      turno: objeto({ tipo: texto, entrada: texto, saida: texto }), permissoes: array(texto), data_admissao: data, salario: moeda, ativo: booleano
    }),
    servicos: objeto({
      _id: id, nome: texto, categoria: texto, descricao: texto, preco: moeda, unidade: texto, disponivel: booleano,
      horario_disponivel: objeto({ inicio: texto, fim: texto }), tags: array(texto)
    }),
    feedbacks: objeto({
      _id: id, hospede_id: id, hospedagem_id: id, quarto_id: id, data_avaliacao: data, nota_geral: nota,
      notas_detalhadas: objeto({ limpeza: nota, atendimento: nota, conforto: nota, custo_beneficio: nota, localizacao: nota }),
      comentario: texto, resposta_hotel: nulo(objeto({ texto, data, funcionario_id: id })), visivel: booleano
    })
  };
  const nomes = Object.keys(esquemas);
  const lotes = Object.fromEntries(nomes.map(nome => [nome,
    EJSON.parse(fs.readFileSync(path.join(process.cwd(), "dados", nome + ".json"), "utf8"), { relaxed: false })
  ]));

  // Antes de escrever, recuse documentos de outro modelo. Nenhuma coleção é apagada.
  for (const nome of nomes) {
    if (banco.getCollectionNames().includes(nome) &&
        banco.getCollection(nome).countDocuments({ $nor: [{ $jsonSchema: esquemas[nome] }] }) > 0) {
      throw new Error("Há documentos de outro modelo em " + nome + ". Use um banco vazio para esta demonstração.");
    }
  }
  for (const nome of nomes) {
    const regras = { validator: { $jsonSchema: esquemas[nome] }, validationLevel: "strict", validationAction: "error" };
    if (!banco.getCollectionNames().includes(nome)) banco.createCollection(nome, regras);
    else {
      const resultado = banco.runCommand({ collMod: nome, ...regras });
      if (!resultado.ok) throw new Error("Não foi possível configurar " + nome);
    }
  }
  for (const [colecao, campo] of [
    ["hospedes", "cpf"], ["hospedes", "email"], ["quartos", "numero"], ["reservas", "codigo_reserva"],
    ["hospedagens", "reserva_id"], ["pagamentos", "hospedagem_id"], ["funcionarios", "cpf"], ["funcionarios", "email"], ["feedbacks", "hospedagem_id"]
  ]) banco.getCollection(colecao).createIndex({ [campo]: 1 }, { unique: true });
  for (const nome of nomes) {
    for (const documento of lotes[nome]) {
      banco.getCollection(nome).updateOne({ _id: documento._id }, { $setOnInsert: documento }, { upsert: true });
    }
    print(nome + ": " + banco.getCollection(nome).countDocuments() + " documentos");
  }

  // Conferência das relações e contas após a carga; somente leitura nesta etapa.
  const documentos = Object.fromEntries(nomes.map(nome => [nome, banco.getCollection(nome).find().toArray()]));
  const mapas = Object.fromEntries(nomes.map(nome => [nome, new Map(documentos[nome].map(d => [d._id.toHexString(), d]))]));
  const exigir = (ok, mensagem) => { if (!ok) throw new Error(mensagem); };
  const igual = (a, b) => a.toHexString() === b.toHexString();
  const ref = (nome, chave) => {
    const valor = mapas[nome].get(chave.toHexString());
    exigir(!!valor, "Referência inexistente em " + nome);
    return valor;
  };
  const centavos = valor => {
    const partes = valor.toString().split(".");
    exigir(/^\d+$/.test(partes[0]) && (partes[1] || "").length <= 2, "Valor monetário inválido");
    return BigInt(partes[0]) * 100n + BigInt(((partes[1] || "") + "00").slice(0, 2));
  };
  for (const r of documentos.reservas) {
    ref("hospedes", r.hospede_id);
    const q = ref("quartos", r.quarto_id);
    exigir(r.data_checkout > r.data_checkin && (r.data_checkout - r.data_checkin) / 86400000 === Number(r.num_noites), "Datas da reserva inconsistentes");
    exigir(Number(r.num_hospedes) <= Number(q.capacidade_max), "Capacidade do quarto excedida");
    exigir(centavos(r.valor_total) === centavos(r.quarto_snapshot.preco_diaria) * BigInt(Number(r.num_noites)), "Total da reserva incorreto");
  }
  const reservasValidas = documentos.reservas.filter(r => r.status !== "cancelada");
  reservasValidas.forEach((a, i) => reservasValidas.slice(i + 1).forEach(b => {
    if (igual(a.quarto_id, b.quarto_id)) exigir(!(a.data_checkin < b.data_checkout && b.data_checkin < a.data_checkout), "Reservas sobrepostas");
  }));
  for (const h of documentos.hospedagens) {
    const r = ref("reservas", h.reserva_id);
    exigir(igual(h.hospede_id, r.hospede_id) && igual(h.quarto_id, r.quarto_id), "Vínculos da hospedagem incorretos");
    ref("funcionarios", h.funcionario_checkin_id);
    if (h.funcionario_checkout_id) ref("funcionarios", h.funcionario_checkout_id);
    if (h.status === "encerrada") exigir(h.checkout_real > h.checkin_real && h.funcionario_checkout_id !== null, "Checkout inconsistente");
    else exigir(h.checkout_real === null && h.funcionario_checkout_id === null, "Hospedagem aberta com checkout preenchido");
    let total = 0n;
    for (const s of h.servicos_consumidos) {
      ref("servicos", s.servico_id);
      exigir(centavos(s.total) === centavos(s.preco_unitario) * BigInt(Number(s.quantidade)), "Total de serviço incorreto");
      exigir(s.data >= h.checkin_real && (!h.checkout_real || s.data <= h.checkout_real), "Consumo fora da estadia");
      total += centavos(s.total);
    }
    exigir(total === centavos(h.total_servicos), "Soma dos serviços incorreta");
    exigir(centavos(h.total_diarias) === centavos(r.valor_total), "Diárias diferentes da reserva");
    exigir(centavos(h.total_geral) === centavos(h.total_diarias) + total, "Total da conta incorreto");
  }
  for (const p of documentos.pagamentos) {
    const h = ref("hospedagens", p.hospedagem_id);
    exigir(igual(p.reserva_id, h.reserva_id) && igual(p.hospede_id, h.hospede_id), "Vínculos do pagamento incorretos");
    exigir(centavos(p.valor_total) === centavos(h.total_geral), "Valor da conta divergente");
    const recebido = p.parcelas.filter(x => x.status === "aprovado").reduce((s, x) => s + centavos(x.valor), 0n);
    exigir(recebido <= centavos(p.valor_total), "Recebimento maior que a conta");
    if (p.status === "pago") exigir(recebido === centavos(p.valor_total) && p.data_pagamento !== null, "Quitação inconsistente");
    if (p.status === "parcial") exigir(recebido > 0n && recebido < centavos(p.valor_total), "Pagamento parcial inconsistente");
    if (p.status === "pendente") exigir(recebido === 0n, "Pagamento pendente inconsistente");
  }
  for (const f of documentos.feedbacks) {
    const h = ref("hospedagens", f.hospedagem_id);
    exigir(igual(f.hospede_id, h.hospede_id) && igual(f.quarto_id, h.quarto_id), "Vínculos da avaliação incorretos");
    exigir(h.status === "encerrada" && f.data_avaliacao >= h.checkout_real, "Avaliação antes do checkout");
    if (f.resposta_hotel) {
      ref("funcionarios", f.resposta_hotel.funcionario_id);
      exigir(f.resposta_hotel.data >= f.data_avaliacao, "Resposta anterior à avaliação");
    }
  }
  print("Hotel CineLuz pronto. Referências, períodos e valores conferidos.");
  print("Executar novamente preserva os documentos já existentes com os mesmos IDs.");
})();
