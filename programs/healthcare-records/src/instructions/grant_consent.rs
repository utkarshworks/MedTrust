use anchor_lang::prelude::*;

use crate::constants::{CONSENT_SEED, RECORD_SEED};
use crate::error::HealthcareError;
use crate::state::{Consent, Record};

pub fn handle_grant_consent(
    ctx: Context<GrantConsent>,
    record_id: u64,
    expires_at: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(expires_at > now, HealthcareError::InvalidExpiry);

    let consent = &mut ctx.accounts.consent;

    consent.patient = ctx.accounts.patient.key();
    consent.provider = ctx.accounts.provider.key();
    consent.record = ctx.accounts.record.key();
    consent.record_id = record_id;
    consent.granted_at = now;
    consent.expires_at = expires_at;
    consent.active = true;

    Ok(())
}

#[derive(Accounts)]
#[instruction(record_id: u64)]
pub struct GrantConsent<'info> {
    #[account(
        seeds = [
            RECORD_SEED,
            patient.key().as_ref(),
            &record_id.to_le_bytes()
        ],
        bump,
        constraint = record.patient == patient.key(),
        constraint = record.record_id == record_id
    )]
    pub record: Account<'info, Record>,

    #[account(
        init_if_needed,
        payer = patient,
        space = 8 + Consent::INIT_SPACE,
        seeds = [
            CONSENT_SEED,
            patient.key().as_ref(),
            provider.key().as_ref(),
            &record_id.to_le_bytes()
        ],
        bump
    )]
    pub consent: Account<'info, Consent>,

    #[account(mut)]
    pub patient: Signer<'info>,

    /// CHECK: Provider is the identity receiving consent.
    pub provider: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

