<?php

namespace App\Exceptions\<Domaine>;

/**
 * <Refus métier, en une phrase : ce qui empêche l'opération.> Le message est celui qu'affiche l'appelant.
 */
final class <Nom>Exception extends \DomainException
{
    public static function <cas>(<Param> $param): self
    {
        return new self('<Message affiché à l\'utilisateur>');
    }
}
