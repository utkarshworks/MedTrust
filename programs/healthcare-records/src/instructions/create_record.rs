use anchor_lang::prelude::*;

use crate::constants::RECORD_SEED;
use crate::state::Record;

pub fn handle_create_record(
    ctx: Context<CreateRecord>,
    record_id: u64,
    record_hash: [u8; 32],
) -> Result<()> {
    let record = &mut ctx.accounts.record;

    record.patient = ctx.accounts.patient.key();
    record.provider = ctx.accounts.provider.key();
    record.record_id = record_id;
    record.record_hash = record_hash;
    record.created_at = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
#[instruction(record_id: u64)]
pub struct CreateRecord<'info> {
    #[account(
        init,
        payer = patient,
        space = 8 + Record::INIT_SPACE,
        seeds = [RECORD_SEED, patient.key().as_ref(), &record_id.to_le_bytes()],
        bump
    )]
    pub record: Account<'info, Record>,

    #[account(mut)]
    pub patient: Signer<'info>,

    /// CHECK: Provider identity is recorded but does not need to sign
    pub provider: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
