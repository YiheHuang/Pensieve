use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use rand::RngCore;
use thiserror::Error;
use zeroize::Zeroize;

const NONCE_LEN: usize = 12;
const SALT_LEN: usize = 16;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("密钥派生失败")]
    KeyDerivation,
    #[error("加密失败")]
    Encryption,
    #[error("解密失败，PIN 或备份密码不正确")]
    Decryption,
    #[error("加密数据格式损坏")]
    InvalidPayload,
}

pub fn random_salt() -> [u8; SALT_LEN] {
    let mut salt = [0u8; SALT_LEN];
    rand::rng().fill_bytes(&mut salt);
    salt
}

pub fn derive_key(secret: &str, salt: &[u8]) -> Result<[u8; 32], CryptoError> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(secret.as_bytes(), salt, &mut key)
        .map_err(|_| CryptoError::KeyDerivation)?;
    Ok(key)
}

pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| CryptoError::Encryption)?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let encrypted = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
        .map_err(|_| CryptoError::Encryption)?;
    let mut payload = Vec::with_capacity(NONCE_LEN + encrypted.len());
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&encrypted);
    Ok(payload)
}

pub fn decrypt(key: &[u8; 32], payload: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if payload.len() <= NONCE_LEN {
        return Err(CryptoError::InvalidPayload);
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| CryptoError::Decryption)?;
    cipher
        .decrypt(
            Nonce::from_slice(&payload[..NONCE_LEN]),
            &payload[NONCE_LEN..],
        )
        .map_err(|_| CryptoError::Decryption)
}

pub struct SecretKey(pub [u8; 32]);
impl Drop for SecretKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn round_trip_and_wrong_pin() {
        let salt = random_salt();
        let key = derive_key("1234", &salt).unwrap();
        let encrypted = encrypt(&key, "珍贵记忆".as_bytes()).unwrap();
        assert_eq!(decrypt(&key, &encrypted).unwrap(), "珍贵记忆".as_bytes());
        let wrong = derive_key("5678", &salt).unwrap();
        assert!(decrypt(&wrong, &encrypted).is_err());
    }
}
