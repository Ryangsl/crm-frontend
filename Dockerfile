# Build estatico do PWA servido por Nginx (crm-spec/docs/08-devops/deployment.md secao 2).
# Em desenvolvimento o frontend roda via `npm run dev` fora de container (D-023); esta
# imagem existe para deploy e para validar a stack completa via `--profile apps`.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
