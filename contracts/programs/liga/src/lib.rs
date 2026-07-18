// 4Line On-Chain — programa Anchor da liga (ESBOÇO / skeleton).
//
// Responsabilidades do contrato:
//   - Criar uma liga com buy-in, janela de submissão e fixture(s) alvo.
//   - Receber buy-ins em escrow (SOL ou SPL — aqui esboçado em lamports).
//   - Registrar o COMMIT (hash) da cartela de cada jogador antes do apito
//     (commit–reveal impede editar palpite depois do jogo).
//   - Liquidar usando o resultado validado pelo oráculo TxLINE (CPI/view para
//     validateStatV2) e distribuir o prêmio ao(s) vencedor(es).
//
// Este arquivo é um ponto de partida para a Fase 2 do roadmap. A liquidação
// real via TxLINE (validateStatV2) e o rateio detalhado ficam marcados como
// TODO — a lógica de pontuação de referência está em web/lib/scoring.mjs.

use anchor_lang::prelude::*;

declare_id!("Liga1111111111111111111111111111111111111111");

#[program]
pub mod liga {
    use super::*;

    /// Cria uma liga. `entry_fee` em lamports; `submit_deadline` é unix ts.
    pub fn create_league(
        ctx: Context<CreateLeague>,
        league_id: u64,
        entry_fee: u64,
        submit_deadline: i64,
        fixture_id: u64,
        rake_bps: u16, // taxa da casa em basis points (ex.: 500 = 5%)
    ) -> Result<()> {
        let league = &mut ctx.accounts.league;
        league.authority = ctx.accounts.authority.key();
        league.league_id = league_id;
        league.entry_fee = entry_fee;
        league.submit_deadline = submit_deadline;
        league.fixture_id = fixture_id;
        league.rake_bps = rake_bps;
        league.pot = 0;
        league.entrants = 0;
        league.settled = false;
        Ok(())
    }

    /// Entra na liga: paga o buy-in (escrow) e registra o hash da cartela.
    pub fn enter(ctx: Context<Enter>, cartela_hash: [u8; 32]) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < ctx.accounts.league.submit_deadline,
            LigaError::SubmissionClosed
        );

        // Transfere o buy-in do jogador para a PDA de escrow da liga.
        let ix = anchor_lang::system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.league.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), ix),
            ctx.accounts.league.entry_fee,
        )?;

        let entry = &mut ctx.accounts.entry;
        entry.player = ctx.accounts.player.key();
        entry.league = ctx.accounts.league.key();
        entry.cartela_hash = cartela_hash; // commit
        entry.revealed = false;
        entry.points = 0;

        let league = &mut ctx.accounts.league;
        league.pot = league.pot.checked_add(league.entry_fee).unwrap();
        league.entrants = league.entrants.checked_add(1).unwrap();
        Ok(())
    }

    /// Revela a cartela (após o apito) e valida o commit.
    /// A pontuação é calculada off-chain (scoring.mjs) e trazida aqui já
    /// verificada contra o oráculo; on-chain conferimos o hash do reveal.
    pub fn reveal(ctx: Context<Reveal>, cartela_bytes: Vec<u8>, points: u64) -> Result<()> {
        let expected = anchor_lang::solana_program::hash::hash(&cartela_bytes).to_bytes();
        require!(expected == ctx.accounts.entry.cartela_hash, LigaError::CommitMismatch);

        // TODO (Fase 2): antes de aceitar `points`, chamar validateStatV2 do
        // programa TxLINE (view/CPI) para provar cada variável da cartela
        // contra o resultado on-chain. Só então gravar a pontuação.
        let entry = &mut ctx.accounts.entry;
        entry.revealed = true;
        entry.points = points;
        Ok(())
    }

    /// Liquida a liga e paga o vencedor. (Esboço: winner-takes-all.)
    pub fn settle(_ctx: Context<Settle>) -> Result<()> {
        // TODO (Fase 2):
        //  - garantir submit_deadline vencido e fixture finalizada;
        //  - determinar o(s) vencedor(es) pela maior pontuação revelada;
        //  - descontar rake_bps para a autoridade;
        //  - transferir o prêmio da PDA de escrow para o(s) vencedor(es);
        //  - marcar league.settled = true.
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(league_id: u64)]
pub struct CreateLeague<'info> {
    #[account(
        init, payer = authority, space = 8 + League::LEN,
        seeds = [b"league", league_id.to_le_bytes().as_ref()], bump
    )]
    pub league: Account<'info, League>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Enter<'info> {
    #[account(mut)]
    pub league: Account<'info, League>,
    #[account(
        init, payer = player, space = 8 + Entry::LEN,
        seeds = [b"entry", league.key().as_ref(), player.key().as_ref()], bump
    )]
    pub entry: Account<'info, Entry>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Reveal<'info> {
    #[account(mut, has_one = player)]
    pub entry: Account<'info, Entry>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(mut)]
    pub league: Account<'info, League>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct League {
    pub authority: Pubkey,
    pub league_id: u64,
    pub entry_fee: u64,
    pub submit_deadline: i64,
    pub fixture_id: u64,
    pub rake_bps: u16,
    pub pot: u64,
    pub entrants: u32,
    pub settled: bool,
}
impl League {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 2 + 8 + 4 + 1;
}

#[account]
pub struct Entry {
    pub player: Pubkey,
    pub league: Pubkey,
    pub cartela_hash: [u8; 32],
    pub revealed: bool,
    pub points: u64,
}
impl Entry {
    pub const LEN: usize = 32 + 32 + 32 + 1 + 8;
}

#[error_code]
pub enum LigaError {
    #[msg("Submissões encerradas para esta liga.")]
    SubmissionClosed,
    #[msg("O reveal não corresponde ao commit da cartela.")]
    CommitMismatch,
}
