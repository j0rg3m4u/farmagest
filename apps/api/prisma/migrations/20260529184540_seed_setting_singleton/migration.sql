-- Garante que o registro singleton de configurações existe.
-- Executado após qualquer migração em ambientes que não rodaram o seed.
INSERT INTO "Setting" ("id", "requireExchangeApproval", "exchangeTolerancePct", "exchangeApprovalThreshold", "exchangeSequence", "geraSequence", "updatedAt")
VALUES ('singleton', false, 5.00, 0.00, 0, 0, NOW())
ON CONFLICT ("id") DO NOTHING;