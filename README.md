# Filmografia da Cinemateca Brasileira

A instituição responsável pela preservação da produção audiovisual do Brasil é a [Cinemateca Brasileira](https://pt.wikipedia.org/wiki/Cinemateca_Brasileira). Entre outros catálogos,  [seu website](http://www.cinemateca.gov.br) hospeda dados sobre [filmografia brasileira](http://bases.cinemateca.gov.br/cgi-bin/wxis.exe/iah/?IsisScript=iah/iah.xis&base=FILMOGRAFIA&lang=p). Infelizmente, não há, de maneira direta, como baixar este dados integralmente, sendo necessário recorrer à [raspagem de dados](https://pt.wikipedia.org/wiki/Raspagem_de_dados).

Este projeto tem como objetivo gerar dados estruturados e em formato aberto a partir dos dados do site da cinemateca.


## Desenvolvimento

Pré-requisitos:

* Node.js
* Yarn

Instale as depedência com o comando `yarn`.

Baixe o espelho das páginas da cinemateca e descompacte no diretório `./html`.:

* [cinemateca-html-2018-10-03.zip](https://www.dropbox.com/s/0jb3gqice2kjcwl/cinemateca-html-2018-10-03.zip?dl=0)

Rode o script com `yarn start`, que irá interpretar os arquivos html e salvar o resultado em formato yaml no diretório `./obras`.

## Licença

MIT