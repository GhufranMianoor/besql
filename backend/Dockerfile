# ── Build stage ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY *.sln ./
COPY BeSQL.Domain/BeSQL.Domain.csproj            BeSQL.Domain/
COPY BeSQL.Application/BeSQL.Application.csproj  BeSQL.Application/
COPY BeSQL.Infrastructure/BeSQL.Infrastructure.csproj BeSQL.Infrastructure/
COPY BeSQL.WebAPI/BeSQL.WebAPI.csproj            BeSQL.WebAPI/

RUN dotnet restore BeSQL.WebAPI/BeSQL.WebAPI.csproj

COPY . .
RUN dotnet publish BeSQL.WebAPI/BeSQL.WebAPI.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "BeSQL.WebAPI.dll"]
