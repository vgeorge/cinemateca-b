#!/usr/bin/env bash

mkdir -p html

counter=1
while [ $counter -le 999999 ]
do
    counter=$(( $counter + 1 ))    
    id=`printf %06d $counter` # add padding zeros
    file="./html/${id}.html"

    # Check if file exists and is not empty
    if [[ -f "$file" && -s "$file" ]]; then
        continue
    fi

    curl "http://bases.cinemateca.gov.br/cgi-bin/wxis.exe/iah/?IsisScript=iah/iah.xis&base=FILMOGRAFIA&lang=p&nextAction=lnk&exprSearch=ID=${id}&format=detailed.pft#" \
        -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0' \
        -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
        -H 'Accept-Language: pt-BR,es;q=0.8,en;q=0.5,en-US;q=0.3' \
        --compressed \
        -H 'DNT: 1' \
        -H 'Connection: keep-alive' \
        -H 'Upgrade-Insecure-Requests: 1' \
        -H 'Cache-Control: max-age=0' \
        | iconv -f LATIN1 -t UTF8 > $file

    # Break if result if not a valid movie page
    # if grep -q "<b>0</b>" "$file"; then
    #     rm $file
    #     break
    # fi

    echo $file
    sleep 5
done