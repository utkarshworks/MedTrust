use anchor_lang::prelude::*;

use crate::constants::CONSENT_SEED;
use crate::error::HealthcareError;
use crate::state::Consent;

pub fn handle_verify_access(
    ctx: Context<VerifyAccess>,
) -> Result<()> {
    let consent = &ctx.accounts.consent;
    let now = Clock::get()?.unix_timestamp;

    require!(consent.active, HealthcareError::ConsentRevoked);
    require!(now < consent.expires_at, HealthcareError::ConsentExpired);
    require!(
        consent.provider == ctx.accounts.provider.key(),
        HealthcareError::InvalidProvider
    );

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAccess<'info> {
    #[account(
        seeds = [
            CONSENT_SEED,
            consent.patient.as_ref(),
            provider.key().as_ref(),
            &consent.record_id.to_le_bytes()
        ],
        bump
    )]
    pub consent: Account<'info, Consent>,

    pub provider: Signer<'info>,
}

