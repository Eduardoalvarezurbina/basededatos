# Usa una imagen oficial de Node.js como imagen base
FROM node:18-alpine

# Establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia package.json y package-lock.json al directorio de trabajo
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto del código fuente de la aplicación
COPY . .

# Expone el puerto 3001 para que la aplicación sea accesible
EXPOSE 3001

# Define el comando para ejecutar la aplicación
CMD [ "node", "index.js" ]
