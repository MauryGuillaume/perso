# API PodoLogiciel : Node 20, aucune dépendance npm
FROM node:20-alpine
WORKDIR /app
COPY . .
# L'API tourne avec un utilisateur sans droits, les fichiers restent en lecture seule pour lui
RUN addgroup -S podo && adduser -S podo -G podo
USER podo
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/sante || exit 1
CMD ["node", "serveur.js"]
