## Como levantar el proyecto?

- Primero, debes tener la base de datos de postgre y agregar la ruta de la db en el archivo ENV en DATABASE_URL=

- Ejecuta el siguiente comando de prisma

```
npx prisma migrate dev --name init
```

- Desde cada carpeta deberas ejecutar el comando

```
npm run dev
```
