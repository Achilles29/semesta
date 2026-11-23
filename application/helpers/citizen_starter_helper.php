<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** Item identities, not job privileges. Changing profession never issues a second grant. */
function citizen_starter_tool($occupation)
{
    $tools = array(
        'pelajar'=>array('study-kit','Buku dan alat tulis'), 'mahasiswa'=>array('study-kit','Buku dan alat tulis'),
        'guru'=>array('teaching-kit','Perangkat mengajar'), 'asn'=>array('office-kit','Perangkat administrasi'),
        'tni'=>array('field-kit','Perlengkapan lapangan'), 'polri'=>array('patrol-kit','Buku patroli dan peluit'),
        'tenaga-kesehatan'=>array('care-kit','Tas pertolongan'), 'petani'=>array('farm-kit','Cangkul dan penyiram'),
        'nelayan'=>array('fishing-kit','Pancing dan kotak alat'), 'peternak'=>array('livestock-kit','Peralatan kandang'),
        'pedagang'=>array('trade-kit','Buku stok dan tas dagang'), 'pekerja-swasta'=>array('office-kit','Perangkat administrasi'),
        'buruh'=>array('work-kit','Kotak alat dan sarung tangan'), 'konstruksi'=>array('work-kit','Kotak alat dan sarung tangan'),
        'pengemudi'=>array('driver-kit','Kotak perkakas kendaraan'), 'koki'=>array('cook-kit','Peralatan masak dasar'),
        'pekerja-kreatif'=>array('art-kit','Buku sketsa dan alat gambar'),
        'pekerja-rumah-tangga'=>array('household-kit','Peralatan rumah tangga'), 'ibu-rumah-tangga'=>array('household-kit','Peralatan rumah tangga'),
        'pencari-kerja'=>array('citizen-kit','Tas dan buku warga'), 'pensiunan'=>array('citizen-kit','Tas dan buku warga'),
        'lainnya'=>array('citizen-kit','Tas dan buku warga'), 'tidak-menyebutkan'=>array('citizen-kit','Tas dan buku warga')
    );
    return $tools[$occupation] ?? array('citizen-kit','Tas dan buku warga');
}
