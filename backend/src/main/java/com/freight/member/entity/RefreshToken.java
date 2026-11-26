package com.freight.member.entity;

import com.freight.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 로그인을 유지하는 데 쓰는 리프레시 토큰. 원문은 쿠키에만 있고 DB에는 해시만 저장하므로, DB가 유출돼도 토큰으로 쓸 수 없다. */
@Getter
@Entity
@Table(name = "refresh_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private RefreshToken(Long memberId, String tokenHash, LocalDateTime expiresAt) {
        this.memberId = memberId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    /** 토큰 원문을 해시로 바꿔 저장할 리프레시 토큰을 만든다. */
    public static RefreshToken create(Long memberId, String rawToken, LocalDateTime expiresAt) {
        return new RefreshToken(memberId, hash(rawToken), expiresAt);
    }

    /** 토큰 원문을 DB 조회에 쓰는 SHA-256 해시(16진수 64자)로 바꾼다. */
    public static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 쓸 수 없습니다", e);
        }
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
