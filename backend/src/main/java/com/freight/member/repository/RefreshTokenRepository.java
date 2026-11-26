package com.freight.member.repository;

import com.freight.member.entity.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 리프레시 토큰 저장소. 토큰은 원문이 아니라 해시로 찾는다. */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);
}
