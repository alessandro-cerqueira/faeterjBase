"use strict";

import ModelError from "/ModelError.js";
import Aluno from "/Aluno.js";

export default class DaoAluno {
  
  //-----------------------------------------------------------------------------------------//

  static conexao = null;

  constructor() {
    this.arrayAlunos = [];
    this.obterConexao();
  }

  //-----------------------------------------------------------------------------------------//
  
  /*
   *  Devolve uma Promise com a referência para o BD
   */ 
  async obterConexao() {
    if(DaoAluno.conexao == null) {
      DaoAluno.conexao = new Promise(function(resolve, reject) {
        let requestDB = window.indexedDB.open("AlunoDB", 1); 

        requestDB.onupgradeneeded = (event) => {
          let db = event.target.result;
          let store = db.createObjectStore("AlunoST", {
            autoIncrement: true
          });
          store.createIndex("idxMatricula", "matricula", { unique: true });
        };

        requestDB.onerror = event => {
          reject(new ModelError("Erro: " + event.target.errorCode));
        };

        requestDB.onsuccess = event => {
          if (event.target.result) {
            // event.target.result apontará para IDBDatabase aberto
            resolve(event.target.result);
          }
          else 
            reject(new ModelError("Erro: " + event.target.errorCode));
        };
      });
    }
    return await DaoAluno.conexao;
  }
  
  //-----------------------------------------------------------------------------------------//

  async obterAlunos() {
    let connection = await this.obterConexao();      
    let promessa = new Promise(function(resolve, reject) {
      let transacao;
      let store;
      let indice;
      try {
        transacao = connection.transaction(["AlunoST"], "readonly");
        store = transacao.objectStore("AlunoST");
        indice = store.index('idxMatricula');
      } 
      catch (e) {
        reject(new ModelError("Erro: " + e));
      }
      let array = [];
      indice.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {        
          const novo = Aluno.assign(cursor.value);
          array.push(novo);
          cursor.continue();
        } else {
          resolve(array);
        }
      };
    });
    this.arrayAlunos = await promessa;
    return this.arrayAlunos;
  }

  //-----------------------------------------------------------------------------------------//

  async obterAlunoPelaMatricula(matr) {
    let connection = await this.obterConexao();      
    let promessa = new Promise(function(resolve, reject) {
      let transacao;
      let store;
      let indice;
      try {
        transacao = connection.transaction(["AlunoST"], "readonly");
        store = transacao.objectStore("AlunoST");
        indice = store.index('idxMatricula');
      } 
      catch (e) {
        reject(new ModelError("Erro: " + e));
      }

      let consulta = indice.get(matr);
      consulta.onsuccess = function(event) { 
        if(consulta.result != null)
          resolve(Aluno.assign(consulta.result)); 
        else
          resolve(null);
      };
      consulta.onerror = function(event) { reject(null); };
    });
    let aluno = await promessa;
    return aluno;
  }

  //-----------------------------------------------------------------------------------------//

  async obterAlunosPeloAutoIncrement() {
    let connection = await this.obterConexao();      
    let promessa = new Promise(function(resolve, reject) {
      let transacao;
      let store;
      try {
        transacao = connection.transaction(["AlunoST"], "readonly");
        store = transacao.objectStore("AlunoST");
      } 
      catch (e) {
        reject(new ModelError("Erro: " + e));
      }
      let array = [];
      store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {        
          const novo = Aluno.assign(cursor.value);
          array.push(novo);
          cursor.continue();
        } else {
          resolve(array);
        }
      };
    });
    this.arrayAlunos = await promessa;
    return this.arrayAlunos;
  }

  //-----------------------------------------------------------------------------------------//

  async incluir(aluno) {
    let connection = await this.obterConexao();      
    let resultado = new Promise( (resolve, reject) => {
      let transacao = connection.transaction(["AlunoST"], "readwrite");
      transacao.onerror = event => {
        reject(new ModelError("Não foi possível incluir o aluno", event.target.error));
      };
      let store = transacao.objectStore("AlunoST");
      let requisicao = store.add(Aluno.deassign(aluno));
      requisicao.onsuccess = function(event) {
          resolve(true);              
      };
    });
    return await resultado;
  }

  //-----------------------------------------------------------------------------------------//

  async alterar(aluno) {
    let connection = await this.obterConexao();      
    let resultado = new Promise(function(resolve, reject) {
      let transacao = connection.transaction(["AlunoST"], "readwrite");
      transacao.onerror = event => {
        reject(new ModelError("Não foi possível alterar o aluno", event.target.error));
      };
      let store = transacao.objectStore("AlunoST");     
      let indice = store.index('idxMatricula');
      var keyValue = IDBKeyRange.only(aluno.getMatricula());
      indice.openCursor(keyValue).onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.matricula == aluno.getMatricula()) {
            const request = cursor.update(Aluno.deassign(aluno));
            request.onsuccess = () => {
              console.log("[DaoAluno.alterar] Cursor update - Sucesso ");
              resolve("Ok");
              return;
            };
          } 
        } else {
          reject(new ModelError("Aluno com a matrícula " + aluno.getMatricula() + " não encontrado!",""));
        }
      };
    });
    return await resultado;
  }
  
  //-----------------------------------------------------------------------------------------//

  async excluir(aluno) {
    let connection = await this.obterConexao();      
    let transacao = await new Promise(function(resolve, reject) {
      let transacao = connection.transaction(["AlunoST"], "readwrite");
      transacao.onerror = event => {
        reject(new ModelError("Não foi possível excluir o aluno", event.target.error));
      };
      let store = transacao.objectStore("AlunoST");
      let indice = store.index('idxMatricula');
      var keyValue = IDBKeyRange.only(aluno.getMatricula());
      indice.openCursor(keyValue).onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.matricula == aluno.getMatricula()) {
            const request = cursor.delete();
            request.onsuccess = () => { 
              resolve("Ok"); 
            };
            return;
          }
        } else {
          reject(new ModelError("Aluno com a matrícula " + aluno.getMatricula() + " não encontrado!",""));
        }
      };
    });
    return false;
  }

  //-----------------------------------------------------------------------------------------//
}
