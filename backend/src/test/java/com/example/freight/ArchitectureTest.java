package com.example.freight;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.example.freight", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    static final String[] DOMAINS = {"member", "vehicle", "fare", "order", "matching", "delivery", "payment"};

    @ArchTest
    static void noCrossDomainRepositoryAccess(JavaClasses classes) {
        for (String d : DOMAINS) {
            noClasses()
                    .that()
                    .resideOutsideOfPackage("..freight." + d + "..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..freight." + d + ".repository..")
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    @ArchTest
    static final ArchRule controllersDoNotReturnEntities = methods()
            .that()
            .areDeclaredInClassesThat()
            .resideInAPackage("..controller..")
            .and()
            .arePublic()
            .should()
            .notHaveRawReturnType(resideInAPackage("..entity.."))
            .allowEmptyShould(true);
}
