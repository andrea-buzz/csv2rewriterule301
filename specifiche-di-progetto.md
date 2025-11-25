# Specifiche di progetto
Dobbiamo realizzare una semplice PWA installabile con HTML, CSS e vanilla javascript che possa funzionare anche offline, il cui scopo è quello di generare le regole .htaccess per redirigere url origina a url destinazione.
Sarà una singola pagina HTML responsive che consente di importare un file CSV contenente 3 colonne: 
- la prima colonna sarà la lista delle url originarie, 
- la seconda colonna conterrà l'url di destinazione 
- la terza colonna opzionale il valore response status (301, 302, 404, 403, 401, 200)

Il file CSV dovrà essere importato nel database indexeddb del browser, e le url dovranno essere convalidate e ripulite da eventuali caratteri non ammessi attaverso la funzione trim ed eventuali sosituzioni.
