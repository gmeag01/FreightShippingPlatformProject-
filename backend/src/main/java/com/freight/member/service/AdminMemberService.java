package com.freight.member.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.dto.AdminMemberDetailResponse;
import com.freight.member.dto.AdminMemberResponse;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.service.OrderService;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.service.VehicleService;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 전용 회원 관리 서비스.
 * 회원 목록 페이징 검색, 회원 상세 및 차량/배차취소 이력 연동, 회원 계정 정지/활성화 기능을 제공한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMemberService {

    private static final Set<String> ALLOWED_SORT_PROPERTIES =
            Set.of("id", "email", "name", "phone", "role", "status", "createdAt");

    private final MemberRepository memberRepository;
    private final VehicleService vehicleService;
    private final OrderService orderService;

    /**
     * 필터링 조건과 페이징에 따라 회원 목록을 조회한다.
     *
     * @param role 필터링할 역할(null이면 전체)
     * @param status 필터링할 회원 상태(null이면 전체)
     * @param keyword 검색어(이름 또는 이메일 포함 검색, null이면 전체)
     * @param pageable 페이징 정보
     * @return 관리자용 회원 응답 페이지
     */
    public Page<AdminMemberResponse> getMembers(Role role, MemberStatus status, String keyword, Pageable pageable) {
        Pageable safePageable = sanitizePageable(pageable);
        return memberRepository
                .findMembersByFilter(role, status, keyword, safePageable)
                .map(AdminMemberResponse::from);
    }

    /**
     * Swagger 기본값 'string'이나 잘못된 정렬 컬럼 입력 시 500 에러를 방지하고 안전한 정렬로 보정한다.
     */
    private Pageable sanitizePageable(Pageable pageable) {
        if (pageable == null) {
            return PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id"));
        }
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }

        List<Sort.Order> validOrders = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            String property = order.getProperty().replaceAll("[\\[\\]\"']", "").trim();
            if (ALLOWED_SORT_PROPERTIES.contains(property)) {
                validOrders.add(new Sort.Order(order.getDirection(), property));
            }
        }

        Sort sort = validOrders.isEmpty() ? Sort.by(Sort.Direction.DESC, "id") : Sort.by(validOrders);
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }

    /**
     * 회원 상세 정보를 조회한다. 차주인 경우 차량 정보와 배차 취소 횟수를 연동한다.
     *
     * @param memberId 조회할 회원 ID
     * @return 회원 상세 정보 응답 DTO
     * @throws BusinessException MEMBER_NOT_FOUND (회원을 찾을 수 없는 경우)
     */
    public AdminMemberDetailResponse getMemberDetail(Long memberId) {
        Member member = memberRepository
                .findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

        Vehicle vehicle = null;
        long cancellationCount = 0;

        if (member.getRole() == Role.DRIVER) {
            vehicle = vehicleService.findByDriverId(memberId).orElse(null);
            cancellationCount = orderService.countDriverCancellations(memberId);
        }

        return AdminMemberDetailResponse.of(member, vehicle, cancellationCount);
    }

    /**
     * 회원의 계정 상태를 변경한다 (ACTIVE 또는 SUSPENDED).
     *
     * @param targetMemberId 변경할 대상 회원 ID
     * @param newStatus 변경할 신규 상태
     * @param currentAdminId 현재 요청을 수행하는 관리자 ID
     * @return 변경된 회원 응답 DTO
     * @throws BusinessException MEMBER_NOT_FOUND (회원을 찾을 수 없는 경우)
     * @throws BusinessException ADMIN_CANNOT_SUSPEND_SELF (관리자 본인을 정지하려는 경우)
     */
    @Transactional
    public AdminMemberResponse updateMemberStatus(Long targetMemberId, MemberStatus newStatus, Long currentAdminId) {
        Member member = memberRepository
                .findById(targetMemberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

        if (targetMemberId.equals(currentAdminId) && newStatus == MemberStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.ADMIN_CANNOT_SUSPEND_SELF);
        }

        if (newStatus == MemberStatus.SUSPENDED) {
            member.suspend();
        } else {
            member.activate();
        }

        return AdminMemberResponse.from(member);
    }
}
