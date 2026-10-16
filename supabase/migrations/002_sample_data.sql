-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 1: Fundação
-- Migration: 002_sample_data.sql
-- Description: Dados demonstrativos identificados claramente para inicialização
-- NOTA: Todos os registros possuem a tag [DEMO] para não serem confundidos com dados reais.
-- ==============================================================================

DO $$
DECLARE
    demo_workspace_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
    demo_user_id UUID := 'b0000000-0000-0000-0000-000000000001'::UUID;
    comp_1 UUID := 'c0000000-0000-0000-0000-000000000001'::UUID;
    comp_2 UUID := 'c0000000-0000-0000-0000-000000000002'::UUID;
    comp_3 UUID := 'c0000000-0000-0000-0000-000000000003'::UUID;
    comp_4 UUID := 'c0000000-0000-0000-0000-000000000004'::UUID;
    comp_5 UUID := 'c0000000-0000-0000-0000-000000000005'::UUID;
BEGIN
    -- Empresas Demonstrativas (B2B)
    INSERT INTO public.companies (
        id, workspace_id, name, category, address, city, state, country,
        phone, whatsapp_number, whatsapp_verified, email, website_url,
        instagram_url, google_maps_url, source, lead_status, notes
    ) VALUES
    (
        comp_1, demo_workspace_id,
        '[DEMO] LogiTech Transportes & Cargas', 'Transporte & Logística',
        'Av. das Nações Unidas, 14401', 'São Paulo', 'SP', 'Brasil',
        '+55 11 3200-4500', '+55 11 98765-4321', true, 'contato@logitech-demo.com.br',
        'https://logitech-demo.com.br', 'https://instagram.com/logitech_demo',
        'https://maps.google.com/?q=Logitech+Transportes', 'Google Maps Scraping',
        'qualificado', 'Frota com mais de 80 veículos de carga pesada. Interesse em software de rastreamento preditivo.'
    ),
    (
        comp_2, demo_workspace_id,
        '[DEMO] AgroFertil Nutrição Vegetal', 'Agronegócio',
        'Rodovia GO-070, Km 12', 'Goiânia', 'GO', 'Brasil',
        '+55 62 3901-7800', '+55 62 99123-4567', true, 'comercial@agrofertil-demo.com.br',
        'https://agrofertil-demo.com.br', 'https://instagram.com/agrofertil_demo',
        'https://maps.google.com/?q=Agrofertil+Goiania', 'Indicação Comercial',
        'proposta', 'Distribuidora regional em expansão para o Mato Grosso. Proposta enviada de R$ 45.000,00.'
    ),
    (
        comp_3, demo_workspace_id,
        '[DEMO] InovaCloud Soluções Digitais', 'Tecnologia & SaaS',
        'Rua da Assembléia, 100 - Sala 1201', 'Rio de Janeiro', 'RJ', 'Brasil',
        '+55 21 2100-3300', '+55 21 98222-1100', false, 'novosnegocios@inovacloud-demo.com',
        'https://inovacloud-demo.com', 'https://instagram.com/inovacloud_demo',
        'https://maps.google.com/?q=InovaCloud+RJ', 'LinkedIn Outbound',
        'negociacao', 'Ajustando termos de SLA e contrato anual corporativo.'
    ),
    (
        comp_4, demo_workspace_id,
        '[DEMO] Clinica BellaVita Estética Médica', 'Saúde & Estética',
        'Av. Batel, 1750', 'Curitiba', 'PR', 'Brasil',
        '+55 41 3040-5500', '+55 41 97788-9900', true, 'recepcao@bellavita-demo.com.br',
        'https://bellavita-demo.com.br', 'https://instagram.com/bellavita_demo',
        'https://maps.google.com/?q=Clinica+Bellavita+Curitiba', 'Google Maps Scraping',
        'novo', 'Rede com 3 unidades em Curitiba. Primeiro contato previsto para próxima terça-feira.'
    ),
    (
        comp_5, demo_workspace_id,
        '[DEMO] MetalSul Estruturas Metálicas', 'Indústria & Metalurgia',
        'Distrito Industrial, Rua B, 450', 'Caxias do Sul', 'RS', 'Brasil',
        '+55 54 3220-9000', '+55 54 98111-2233', false, 'vendas@metalsul-demo.com.br',
        'https://metalsul-demo.com.br', 'https://instagram.com/metalsul_demo',
        'https://maps.google.com/?q=MetalSul+Caxias', 'Prospecção Fria',
        'contatado', 'Conversamos com o Diretor de Operações. Solicitou apresentação institucional.'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Contatos das Empresas Demonstrativas
    INSERT INTO public.contacts (
        workspace_id, company_id, name, role, phone, whatsapp_number, email, is_primary, linkedin_url
    ) VALUES
    (demo_workspace_id, comp_1, 'Carlos Eduardo Prado', 'Diretor de Logística', '+55 11 3200-4501', '+55 11 98765-4321', 'carlos.prado@logitech-demo.com.br', true, 'https://linkedin.com/in/carlos-prado-demo'),
    (demo_workspace_id, comp_1, 'Juliana Mendes', 'Gerente de Frotas', '+55 11 3200-4505', '+55 11 97654-3210', 'juliana.mendes@logitech-demo.com.br', false, 'https://linkedin.com/in/juliana-mendes-demo'),
    (demo_workspace_id, comp_2, 'Rodrigo Silveira', 'Sócio-Fundador', '+55 62 3901-7801', '+55 62 99123-4567', 'rodrigo@agrofertil-demo.com.br', true, 'https://linkedin.com/in/rodrigo-silveira-demo'),
    (demo_workspace_id, comp_3, 'Mariana Vasconcellos', 'Head de Operações', '+55 21 2100-3305', '+55 21 98222-1100', 'mariana@inovacloud-demo.com', true, 'https://linkedin.com/in/mariana-vasconcellos-demo'),
    (demo_workspace_id, comp_4, 'Dra. Camila Fontana', 'Diretora Clínica', '+55 41 3040-5502', '+55 41 97788-9900', 'camila@bellavita-demo.com.br', true, 'https://linkedin.com/in/camila-fontana-demo'),
    (demo_workspace_id, comp_5, 'Antônio Schimidt', 'Gerente de Suprimentos', '+55 54 3220-9010', '+55 54 98111-2233', 'antonio@metalsul-demo.com.br', true, 'https://linkedin.com/in/antonio-schimidt-demo');

    -- Tarefas Iniciais
    INSERT INTO public.tasks (
        workspace_id, company_id, title, description, due_date, status, priority
    ) VALUES
    (demo_workspace_id, comp_1, 'Enviar estudo de ROI em telemetria', 'Preparar apresentação comparativa de economia de combustível.', now() + interval '2 days', 'pending', 'high'),
    (demo_workspace_id, comp_2, 'Acompanhar aprovação da proposta comercial', 'Ligar para Rodrigo para tirar dúvidas da minuta contratual.', now() + interval '1 day', 'pending', 'high'),
    (demo_workspace_id, comp_3, 'Reunião de alinhamento com equipe de TI', 'Discutir requisitos de integração e autenticação via API.', now() + interval '4 days', 'pending', 'medium'),
    (demo_workspace_id, comp_4, 'Follow-up via WhatsApp com secretária executiva', 'Confirmar melhor dia e horário para demonstração remota.', now() + interval '3 days', 'pending', 'low');

    -- Oportunidades do Pipeline
    INSERT INTO public.opportunities (
        workspace_id, company_id, title, value, stage, probability, close_date
    ) VALUES
    (demo_workspace_id, comp_1, 'Implantação Software de Frota v1.0', 32000.00, 'qualificacao', 60, current_date + interval '25 days'),
    (demo_workspace_id, comp_2, 'Contrato Anual Nutrição Vegetal ERP', 45000.00, 'proposta', 75, current_date + interval '15 days'),
    (demo_workspace_id, comp_3, 'Licenciamento Corporativo InovaCloud', 68000.00, 'negociacao', 85, current_date + interval '10 days');

END $$;
