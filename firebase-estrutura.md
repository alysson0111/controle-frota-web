# Estrutura do Firebase Firestore

No Firebase, o equivalente a uma tabela é uma coleção.

## Coleção principal

Crie a coleção:

```txt
vehicles
```

Cada documento dentro de `vehicles` representa um veículo.

## Campos do documento

Use estes campos:

| Campo | Tipo | Exemplo |
| --- | --- | --- |
| `id` | string | `abc123` |
| `model` | string | `Honda Civic EXL` |
| `year` | number | `2022` |
| `plate` | string | `RVD2A19` |
| `vin` | string | `93HFC2680NZ100321` |
| `origin` | string | `Compra direta` |
| `status` | string | `Disponível` |
| `entryDate` | string | `2026-05-27` |
| `saleDate` | string | `2026-05-27` |
| `mileage` | number | `38400` |
| `purchaseCost` | number | `118000` |
| `extraCost` | number | `4200` |
| `salePrice` | number | `136900` |
| `maintenanceDue` | string | `2026-06-05` |
| `docs` | map/object | ver exemplo abaixo |
| `notes` | string | `Pronto para vitrine` |
| `updatedAt` | timestamp | gerado pelo sistema |

## Exemplo do campo docs

```json
{
  "crlv": true,
  "ipva": true,
  "inspection": true,
  "transfer": false
}
```

## Como criar no Firebase

1. Acesse o Firebase Console.
2. Entre no projeto.
3. Vá em `Firestore Database`.
4. Clique em `Criar banco de dados`.
5. Escolha `Modo produção`.
6. Depois de criado, vá em `Regras`.
7. Cole o conteúdo do arquivo `firestore.rules`.
8. Publique as regras.
9. Vá em `Dados`.
10. Crie a coleção `vehicles`.

## Observação

Você pode criar a coleção manualmente, mas não é obrigatório. O sistema também cria a coleção automaticamente no primeiro veículo cadastrado, desde que:

- O Firebase esteja configurado em `config.js`.
- O usuário esteja logado.
- As regras do Firestore tenham sido publicadas.
