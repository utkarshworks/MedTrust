use anchor_lang::prelude::*;

use crate::constants::CONSENT_SEED;
use crate::state::Consent;

pub fn handle_revoke_consent(
    ctx: Context<RevokeConsent>,
) -> Result<()> {
    let consent = &mut ctx.accounts.consent;

    consent.active = false;

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeConsent<'info> {
    #[account(
        mut,
        seeds = [
            CONSENT_SEED,
            patient.key().as_ref(),
            consent.provider.as_ref(),
            &consent.record_id.to_le_bytes()
        ],
        bump,
        constraint = consent.patient == patient.key()
    )]
    pub consent: Account<'info, Consent>,

    pub patient: Signer<'info>,
}
