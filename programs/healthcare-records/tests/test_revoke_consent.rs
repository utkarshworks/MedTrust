use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;

use healthcare_records::{
    self,
    constants::{CONSENT_SEED, RECORD_SEED},
};

#[test]
fn test_revoke_consent() {
    let mut svm = LiteSVM::new();

    let patient = Keypair::new();
    let provider = Keypair::new();

    svm.airdrop(&patient.pubkey(), 10_000_000_000).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes)
        .unwrap();

    let record_id: u64 = 1;
    let record_hash = [7u8; 32];

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let expires_at = 1_000_000;

    let grant_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::GrantConsent {
            record: record_pda,
            consent: consent_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let revoke_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::RevokeConsent {
            consent: consent_pda,
            patient: patient.pubkey(),
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::RevokeConsent {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[revoke_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let consent_account = svm.get_account(&consent_pda).unwrap();

    // Deserialize the account and verify that active is now false.
    let consent_data =
        &consent_account.data[8..];

    let active_offset = 32 + 32 + 32 + 8 + 8 + 8;

    assert_eq!(consent_data[active_offset], 0);
}

#[test]
fn test_unauthorized_revoke_fails() {
    let mut svm = LiteSVM::new();

    let patient = Keypair::new();
    let provider = Keypair::new();
    let attacker = Keypair::new();

    svm.airdrop(&patient.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();

    let program_bytes =
        include_bytes!("../../../target/deploy/healthcare_records.so");

    svm.add_program(healthcare_records::ID, program_bytes)
        .unwrap();

    let record_id: u64 = 2;
    let record_hash = [8u8; 32];

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let create_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (consent_pda, _) = Pubkey::find_program_address(
        &[
            CONSENT_SEED,
            patient.pubkey().as_ref(),
            provider.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let expires_at = 1_000_000;

    let grant_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::GrantConsent {
            record: record_pda,
            consent: consent_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::GrantConsent {
            record_id,
            expires_at,
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[grant_ix],
        Some(&patient.pubkey()),
        &[&patient],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let revoke_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::RevokeConsent {
            consent: consent_pda,
            patient: attacker.pubkey(),
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::RevokeConsent {}.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[revoke_ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "Unauthorized wallet should not be able to revoke consent"
    );

    let consent_account = svm.get_account(&consent_pda).unwrap();

    let consent_data = &consent_account.data[8..];

    let active_offset = 32 + 32 + 32 + 8 + 8 + 8;

    assert_eq!(
        consent_data[active_offset],
        1,
        "Consent must remain active after unauthorized revoke attempt"
    );
}
